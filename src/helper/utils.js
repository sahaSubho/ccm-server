import moment from 'moment'

function backtrack_lcs_substr(C, X, Y, i, j) {
  if (i === 0 || j === 0) {
    return ''
  } else {
    if (X[i - 1] === Y[j - 1]) {
      return backtrack_lcs_substr(C, X, Y, i - 1, j - 1) + X[i - 1]
    } else {
      if (C[i][j - 1] > C[i - 1][j]) {
        return backtrack_lcs_substr(C, X, Y, i, j - 1)
      } else {
        return backtrack_lcs_substr(C, X, Y, i - 1, j)
      }
    }
  }
}

function find_lcs_substr(X, Y) {
  var C, m, n
  m = X.length
  n = Y.length

  C = function () {
    var _pj_a = [],
      _pj_b = [...Array(m + 1).keys()]

    for (var _pj_c = 0, _pj_d = _pj_b.length; _pj_c < _pj_d; _pj_c += 1) {
      var _ = _pj_b[_pj_c]

      _pj_a.push([0] * (n + 1))
    }

    return _pj_a
  }.call(this)

  for (var i = 1, _pj_a = m + 1; i < _pj_a; i += 1) {
    for (var j = 1, _pj_b = n + 1; j < _pj_b; j += 1) {
      if (X[i - 1] === Y[j - 1]) {
        C[i][j] = C[i - 1][j - 1] + 1
      } else {
        C[i][j] = max(C[i][j - 1], C[i - 1][j])
      }
    }
  }

  return backtrack_lcs_substr(C, X, Y, m, n)
}

function lcs_strings_matching_ic(name1, name2, accuracy) {
  var base_len, lcs
  name1 = name1.toLowerCase()
  name2 = name2.toLowerCase()

  if (name1 === name2) {
    return true
  }

  lcs = find_lcs_substr(name1, name2)
  base_len = Math.min(name1.length, name2.length)

  if (lcs.length >= accuracy * base_len) {
    return true
  }

  return false
}

function isValid(value) {
  if (value === null) return false
  if (value?.trim()?.length === 0) return false
  return true
}

function match_strings(v1, v2, accuracy) {
  if ([v1, v2].some((e) => !e || !e?.length)) return true
  else return lcs_strings_matching_ic(v1, v2, accuracy)
}

function match_name_on_words(
  name1,
  name2,
  spell_correct = true,
  mismatch_count = -1
) {
  let words1, words2
  if (spell_correct) {
    name1 = remove_special_characters(name1)
    name2 = remove_special_characters(name2)
    words1 = new Set(get_words(name1))
    words2 = new Set(get_words(name2))
  } else {
    words1 = new Set(name1.split())
    words2 = new Set(name2.split())
  }
  const matched_count = words1.intersection(words2).size
  console.log(words1.size, words2.size, matched_count)
  let min_words_counts = Math.min(words1.size, words2.size)
  let max_allowed_mismatch
  if (mismatch_count != -1) {
    max_allowed_mismatch = mismatch_count
  } else {
    if (min_words_counts < 3) {
      max_allowed_mismatch = 0
    } else if (min_words_counts < 6) {
      max_allowed_mismatch = 1
    } else {
      max_allowed_mismatch = 2
    }
  }
  if (matched_count >= min(words1.size, words2.size) - max_allowed_mismatch) {
    console.log('Matched on words')
    return true
  }
  return false
}

function match_tournament_venue(venue1, venue2) {
  venue1 = remove_special_characters(venue1).toLowerCase()
  venue2 = remove_special_characters(venue2).toLowerCase()
  if (match_strings(venue1, venue2, 0.8)) {
    console.log('LCS matched')
    return true
  }
  return match_name_on_words(venue1, venue2, { spell_correct: false })
}

function remove_special_characters(name) {
  let cleaned_name = name.replace(/\'s/g, 's')
  let pattern = /[^a-zA-Z0-9\s]/g
  cleaned_name = cleaned_name.replace(pattern, ' ')
  cleaned_name = cleaned_name.replace(/\s+/g, ' ').trim()
  return cleaned_name
}

function dates_within_error_range(t1, t2) {
  // Calculate the absolute difference between the two dates
  if (moment(t1.start_date).isValid() && moment(t2.startDate).isValid()) {
    return (
      moment(t1.start_date).diff(t2.startDate, 'd') < 1 ||
      moment(t2.startDate).diff(t1.start_date, 'd') < 1
    )
  }
  return true
}

function match_tournament_names(name1, name2, stringent = false) {
  if (!stringent) {
    if (lcs_strings_matching_ic(name1, name2, 0.8)) {
      console.log('LCS matched')
      return true
    }
    return match_name_on_words(name1, name2)
  } else {
    if (lcs_strings_matching_ic(name1, name2, 1)) {
      console.log('LCS matched')
      return true
    }
    return match_name_on_words(name1, name2, {
      spellCorrect: true,
      mismatchCount: 0,
    })
  }
}

function trn_matching_common_table(new_obj, row) {
  console.log(1)
  var t1 = new_obj
  var t2 = row
  console.log(2)
  if (!match_strings(t1.derived_state, t2.derived_state, 1)) {
    return false
  }
  console.log(3)
  if (!match_strings(t1.derived_city, t2.derived_city, 1)) {
    return false
  }
  var name_match_stringent = false
  if (
    [
      !isValid(t1.city),
      !isValid(t1.state),
      !isValid(t2.derived_city),
      !isValid(t2.derived_state),
    ].some(Boolean)
  ) {
    name_match_stringent = true
  }
  console.log('stringent :', name_match_stringent)
  if (!match_tournament_venue(t1.address, t2.venue)) {
    return false
  }
  console.log(7)
  if (
    (isValid(t1.tournament_type) && isValid(t2.tournament_type)) ||
    name_match_stringent
  ) {
    if (t1.tournament_type != t2.tournament_type) {
      return false
    }
  }
  var name_without_categories_1 = remove_special_characters(
    t1.name
  ).toLowerCase()
  var name_without_categories_2 = remove_special_characters(
    t2.name_without_categories
  ).toLowerCase()

  if (
    match_tournament_names(
      name_without_categories_1,
      name_without_categories_2,
      name_match_stringent
    )
  )
    // if name is matching and dates are not matching, it may be a mistake - so match them
    return dates_within_error_range(t1, t2)
}
