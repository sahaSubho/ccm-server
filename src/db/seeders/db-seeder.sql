-- Prize categories seeder script
INSERT INTO prize_categories (name, age, age_operator, gender, gender_operator, rating, rating_operator, prize1, prize2, prize3, created_at, updated_at) VALUES ('Under 7 Boys', 7, 0, 'M', 10, null, null, 4, 3, 2, now(), now());
INSERT INTO prize_categories (name, age, age_operator, gender, gender_operator, rating, rating_operator, prize1, prize2, prize3, created_at, updated_at) VALUES ('Under 7 Girls', 7, 0, 'F', 10, null, null, 4, 3, 2, now(), now());
INSERT INTO prize_categories (name, age, age_operator, gender, gender_operator, rating, rating_operator, prize1, prize2, prize3, created_at, updated_at) VALUES ('Under 9 Boys', 9, 0, 'M', 10, null, null, 4, 3, 2, now(), now());
INSERT INTO prize_categories (name, age, age_operator, gender, gender_operator, rating, rating_operator, prize1, prize2, prize3, created_at, updated_at) VALUES ('Under 9 Girls', 9, 0, 'F', 10, null, null, 4, 3, 2, now(), now());
INSERT INTO prize_categories (name, age, age_operator, gender, gender_operator, rating, rating_operator, prize1, prize2, prize3, created_at, updated_at) VALUES ('Under 11 Boys', 11, 0, 'M', 10, null, null, 4, 3, 2, now(), now());
INSERT INTO prize_categories (name, age, age_operator, gender, gender_operator, rating, rating_operator, prize1, prize2, prize3, created_at, updated_at) VALUES ('Under 11 Girls', 11, 0, 'F', 10, null, null, 4, 3, 2, now(), now());
INSERT INTO prize_categories (name, age, age_operator, gender, gender_operator, rating, rating_operator, prize1, prize2, prize3, created_at, updated_at) VALUES ('Under 13 Boys', 13, 0, 'M', 10, null, null, 4, 3, 2, now(), now());
INSERT INTO prize_categories (name, age, age_operator, gender, gender_operator, rating, rating_operator, prize1, prize2, prize3, created_at, updated_at) VALUES ('Under 13 Girls', 13, 0, 'F', 10, null, null, 4, 3, 2, now(), now());

CREATE VIEW tournament_prize_details AS 
select 
    a.id as category_id, 
    a.name, 
    b.id as tournament_id, 
    a.prize1 as rec_priz1, 
    a.prize2 as rec_prize2, 
    a.prize3 as rec_priz3, 
    b.prize1 as prize1, 
    b.prize2 as prize2, 
    b.prize3 as prize3 
from prize_categories a 
left outer join tournament_prize_mappings b 
    on a.id=b.category_id;