const commits_btn = document.querySelector('#commits-btn');
const loc_btn = document.querySelector('#loc-btn');
const loc_display = document.getElementById('#loc-display');
const year_input = document.querySelector('.year-input');
const month_input = document.querySelector('.month-input');
const sha_input = document.querySelector('.sha-input');
const first_commit_button = document.querySelector('#first-commit-btn')

const github_request_headers = {
  'Content-Type': 'application/json',
  'Authorization': '<github PAT>'
}

first_commit_button.addEventListener('click', function (event) {
  chrome.tabs.query({ currentWindow: true, active: true }, async function (tabs) {
    const pageUrl = tabs[0].url.replace(/.+:\/\/(www\.)?github.com\/?/, '');
    let [owner, repo] = pageUrl.split('/');

    let [lastCommit, count, default_branch] = await Promise.all([
      getLastCommit(owner, repo),
      getTotalCommits(owner, repo),
      getDefaultBranch(owner, repo)
    ])

    let repo_discovery_url = `https://github.com/${owner}/${repo}/commits/${default_branch}?before=${lastCommit.sha}+${count}&branch=master`
    chrome.tabs.create({
      url: repo_discovery_url
    });
  });
});

loc_btn.addEventListener('click', function (event) {
  chrome.tabs.query({ currentWindow: true, active: true }, async function (tabs) {
    console.log(tabs[0].url);
    const pageUrl = tabs[0].url.replace(/.+:\/\/(www\.)?github.com\/?/, '');;
    let [owner, repo] = pageUrl.split('/');

    sha = sha_input.value;
    if (sha == "") {
      sha = await getLastCommit;
    }

    let [commit_details, code_frequency, default_branch] = await Promise.all([
      getCommitBySha(owner, repo, sha),
      getCodeFrequency(owner, repo),
    ])

    console.log(commit_details.commit.author.date)
    let date = Math.floor(Date.parse(commit_details.commit.author.date) / 1000);

    console.log("Date:", date)
    console.log("Parsed Date:", date)
    console.log("Code Frequency:", code_frequency)

    count = code_frequency.reduce((total, changes) => {
      if (changes[0] <= date) {
        console.log(changes[0], "<=", date)
        return total + changes[1] + changes[2]
      }
      return total;
    }, 0);

    count = abbreviateNumber(count);
    var loc_display = document.getElementById("loc-display")
    loc_display.style.display = "block";
    loc_display.innerHTML = count + " lines";
  });
});

const SI_SYMBOL = [
  '',
  'k',
  'm',
  'g',
  't',
  'p',
  'e',
];

let abbreviateNumber = (num) => {
  const tier = Math.log10(num) / 3 | 0;

  if (tier === 0) {
    const result = `${num}`;

    return result;
  }

  const suffix = SI_SYMBOL[tier];
  const scale = Math.pow(10, tier * 3);

  const scaled = num / scale;

  const result = `${scaled.toFixed(1)}${suffix}`;

  return result;
};

commits_btn.addEventListener('click', function (event) {
  console.log('Button Clicked');
  console.log(year_input.value)
  console.log(month_input.value)

  chrome.tabs.query({ currentWindow: true, active: true }, async function (tabs) {
    console.log(tabs[0].url);
    const pageUrl = tabs[0].url.replace(/.+:\/\/(www\.)?github.com\/?/, '');;
    let [owner, repo] = pageUrl.split('/');

    // Getting input values
    let until_year = year_input.value;
    let until_month = month_input.value;
    let until_date = moment().format("YYYY-MM-DD");;

    if (until_year != "" && until_month != "") {
      if (until_month.length == 1) {
        until_month = "0" + until_month
      }
      let until_day = "01"
      until_date = until_year + "-" + until_month + "-" + until_day;
    }

    default_branch = await getDefaultBranch(owner, repo)

    let repo_discovery_url = `https://github.com/${owner}/${repo}/commits/${default_branch}?since=1997-01-01&until=${until_date}`
    chrome.tabs.create({
      url: repo_discovery_url
    });
  });
});

let getDefaultBranch = (owner, repo) => {
  return fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    method: 'GET',
    headers: github_request_headers
  }).then((response) => {
    return response.json()
  }).then((repo) => {
    return repo.default_branch
  })
    .catch(err => {
      alert(err.message);
    })
}

let getCodeFrequency = (owner, repo) => {
  return fetch(`https://api.github.com/repos/${owner}/${repo}/stats/code_frequency`, {
    method: 'GET',
    headers: github_request_headers
  }).then((response) => {
    return response.json()
  }
  ).then((code_frequency) => {
    return code_frequency
  }
  ).catch(err => {
    alert(err.message);
  });
}

let getCommitBySha = (owner, repo, sha) => {
  return fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, {
    method: 'GET',
    headers: github_request_headers
  }).then((response) => {
    return response.json()
  }
  ).then((commit) => {
    return commit
  }
  ).catch(err => {
    alert(err.message);
  });
}

let getLastCommit = (owner, repo) => {
  return fetch(`https://api.github.com/repos/${owner}/${repo}/commits`, {
    method: 'GET',
    headers: github_request_headers
  }).then((response) => {
    return response.json()
  }).then((commits) => {
    return commits[0]
  })
    .catch(err => {
      alert(err.message);
    })
}

let getTotalCommits = (owner, repo) => {
  let url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`;
  let pages = 0;

  return fetch(url, {
      headers: github_request_headers,
  })
      .then((data) => data.headers)
      .then((result) => {
          if (result.get("link") == undefined) {
              return 1
          } else {
              return result
                  .get("link")
                  .split(",")[1]
                  .match(/.*page=(?<page_num>\d+)/).groups.page_num
          }
      })
      .then((numberOfPages) => {
          pages = numberOfPages;
          return fetch(url + `&page=${numberOfPages}`, {
              headers: {
                  Accept: "application/vnd.github.v3+json",
              },
          })
              .then((data) => data.json());
      })
      .then((data) => {
          return data.length + (pages - 1) * 100;
      })
      .catch((err) => {
          console.log(err);
      });
};





