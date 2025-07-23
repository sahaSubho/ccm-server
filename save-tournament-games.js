#!/usr/bin/env node
const TOURNAMENT_ID_START = 1798;
const TOURNAMENT_ID_END   = 1809;

require("dotenv").config();

const { Sequelize, QueryTypes } = require("sequelize");
const Redis                   = require("ioredis");
const axios                   = require("axios");
const pLimit                  = require("p-limit");

const {
  DB_HOST,
  DB_PORT     = "5432",
  DB_USER,
  DB_PASS,
  DB_NAME,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  CIRCLECHESS_API_URL,
  API_KEY,
  AUTH_TOKEN,
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host:     DB_HOST,
  port:     parseInt(DB_PORT, 10),
  dialect:  "postgres",
  logging:  false,
});

const BackupGscGame = sequelize.define("backup_gsc_games", {
  tournament_id: { type: Sequelize.INTEGER, allowNull: false },
  table_id:      { type: Sequelize.INTEGER, allowNull: false },
  user_id:       { type: Sequelize.INTEGER, allowNull: false },
  color:         { type: Sequelize.STRING(5), allowNull: false },
  status:        { type: Sequelize.STRING(20), allowNull: false, defaultValue: "pending" },
  last_attempt:  { type: Sequelize.DATE,      allowNull: true },
  response:      { type: Sequelize.JSONB,     allowNull: true },
}, {
  tableName:   "backup_gsc_games",
  timestamps:  true,
  underscored: true,
  indexes: [
    { unique: true, fields: ["tournament_id", "table_id", "user_id"] }
  ]
});

const redis = new Redis({
  host:     REDIS_HOST,
  port:     parseInt(REDIS_PORT, 10),
  password: REDIS_PASSWORD
});
redis.on("error", e => console.error("Redis error", e));

const API_URL = `${CIRCLECHESS_API_URL}/learning/save_circlechess_game/`;
const HEADERS = {
  Accept:        "application/json, text/plain, */*",
  "Content-Type":"application/json",
  "api-key":     API_KEY,
  authorization: AUTH_TOKEN,
  Origin:        CIRCLECHESS_API_URL,
  Referer:       CIRCLECHESS_API_URL,
};

const limit = pLimit(10);

function computeResult(winType, isWhite) {
  if (winType === "1") return isWhite ? "1-0" : "0-1";
  if (winType === "2") return isWhite ? "0-1" : "1-0";
  return "1/2-1/2";
}

async function main() {
  await BackupGscGame.sync();

  const tournamentIds = Array.from(
    { length: TOURNAMENT_ID_END - TOURNAMENT_ID_START + 1 },
    (_, i) => TOURNAMENT_ID_START + i
  );

  try {
    for (const tid of tournamentIds) {
      const mappings = await sequelize.query(
        `SELECT DISTINCT table_id
           FROM ccm_tournament_pairings
          WHERE tournament_id = :tid
            AND table_id IS NOT NULL`,
        { replacements: { tid }, type: QueryTypes.SELECT }
      );

      if (!mappings.length) {
        console.log(`No tables found for tournament ${tid}`);
        continue;
      }

      const tasks = [];

      for (const { table_id } of mappings) {
        const data = await redis.hgetall(`redis:table:${table_id}`);
        if (!data.pos_1 || !data.pos_2) {
          console.log(`Skipping table ${table_id} (incomplete data)`);
          continue;
        }

        const { pgn = "", winType = "", pos_1, pos_2 } = data;

        for (const [posLabel, userId] of [
          ["pos_1", pos_1],
          ["pos_2", pos_2],
        ]) {
          const isWhite = posLabel === "pos_1";
          const oppId   = isWhite ? pos_2 : pos_1;

          const existing = await BackupGscGame.findOne({
            where: { tournament_id: tid, table_id, user_id: +userId }
          });
          if (existing && existing.status === "success") {
            console.log(`Skipping T${tid} table ${table_id} user ${userId} (already done)`);
            continue;
          }

          const payload = {
            user_id:           +userId,
            pgn_content:       pgn,
            opponent_user_id:  +oppId,
            color:             isWhite ? "White" : "Black",
            end_time:          new Date().toISOString().slice(0,19).replace("T"," "),
            result:            computeResult(winType, isWhite),
            time_control:      "3+1", // TODO: (saumitra) Ask for correct format
            opponent_username: data[`player:${oppId}:username`] || "",
            rating:            +data[`player:${userId}:rating`]   || 0,
            rating_change:     0,
            opponent_rating:   +data[`player:${oppId}:rating`]     || 0,
            end_type:          winType,
            table_id:          +table_id,
            game_type:         "tournament",
          };

          tasks.push(limit(async () => {
            const now = new Date();
            try {
              const res = await axios.post(API_URL, payload, { headers: HEADERS });
              console.log(`T${tid} table ${table_id} user ${userId}:`, res.data);

              await BackupGscGame.upsert({
                tournament_id: tid,
                table_id,
                user_id: +userId,
                color: payload.color,
                status: "success",
                last_attempt: now,
                response: res.data
              });
            } catch (err) {
              const errorData = err.response?.data || { message: err.message };
              console.error(`Error T${tid} table ${table_id} user ${userId}:`, errorData);

              await BackupGscGame.upsert({
                tournament_id: tid,
                table_id,
                user_id: +userId,
                color: payload.color,
                status: "error",
                last_attempt: now,
                response: errorData
              });
            }
          }));
        }
      }

      await Promise.all(tasks);
      console.log(`Finished tournament ${tid}`);
    }
  } finally {
    await redis.disconnect();
    await sequelize.close();
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
