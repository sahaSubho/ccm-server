const getFilterBasedOnOperator = (key, player, type, value) => {
  switch (key) {
    case -1:
      return player[type] < value
    case 1:
      return player[type] > value
    default:
      return player[type] === value
  }
}

module.exports = {
  getFilterBasedOnOperator,
}
