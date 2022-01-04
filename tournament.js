const api = "https://api.chess.com/pub/";

/**
 * Generic function to call an API
 */
const callApi = slug => {

    return fetch(api + slug)
            .then(response => response.json())
            .catch(() => null);
};

/**
 * Get the details of the group for the current round of the tournament
 */
const getGroup = (tournament, round, group) => {

    return callApi("tournament/" + [ tournament, round, group ].join("/"));
};

/**
 * Create a list of the players, based on the group data
 */
const createPlayerList = data => {

    data.result = data.input.players.map(player => {

        return Object.assign(player, {
            played: 0,
            live: 0,
            pending: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            possible: 0
        });
    });

    return data;
};

/**
 * Get a username from a player URL
 */
const getUsername = url => {

    const parts = url.split("/");
    return parts[parts.length - 1];
};

/**
 * Analyse a game to find the player and result
 */
const analyseGame = data => {

    if (typeof data === "object") {

        return {
            player: getUsername(data["@id"]),
            result: data.result
        };
    }

    return {
        player: getUsername(data),
        result: "live"
    };
};

/**
 * Add a result to the set of results
 */
const updateResults = (players, game) => {

    players.forEach(player => {
        if (player.username === game.player) {

            if (game.result === "live") {
                player.live++;
            } else if (game.result === "win") {
                player.won++;
                player.played++;
            } else if (game.result === "checkmated" || game.result === "resigned" || game.result === "timeout") {
                player.lost++;
                player.played++;
            } else {
                player.drawn++;
                player.played++;
            }
        }
    });
};

/**
 * Add in details about wins, losses, etc
 */
const addResults = data => {

    data.input.games.forEach(game => {
        updateResults(data.result, analyseGame(game.white));
        updateResults(data.result, analyseGame(game.black));
    });

    return data;
};

/**
 * Add in any games still left to play and maximum available points
 */

const addPendingCount = data => {

    const total = (data.result.length - 1) * 2;

    data.result.forEach(result => {
        result.pending = total - result.played - result.live;
        result.possible = result.points + result.live + result.pending;
    });

    return data;
};

/**
 * Sort the players in the table (first by points, then by tie break score)
 */
const orderPlayers = data => {

    data.sort((a, b) => {

        if (a.points > b.points) {
            return -1;
        }

        if (a.points < b.points) {
            return 1;
        }

        if (a.tie_break > b.tie_break) {
            return -1;
        }

        if (a.tie_break < b.tie_break) {
            return 1;
        }

        return 0;
    });

    return data;
};

/**
 * Create a table row
 */
const createRow = data => {

    const result = document.createElement("tr");
    const columns = [ "username", "played", "live", "pending", "won", "drawn", "lost", "possible", "tie_break", "points" ];

    const cells = columns.forEach(column => {

        const cell = document.createElement("td");
        cell.textContent = data[column];
        result.appendChild(cell);
    });

    return result;
};

/**
 * Create the table
 */
const createTable = data => {

    const result = document.createElement("table");
    result.setAttribute("id", "league");

    const headingsRow = [ "Player", "Played", "Live", "Pending", "Won", "Drawn", "Lost", "Possible", "Tie Break", "Points" ].reduce((row, heading) => {

        elem = document.createElement("th");
        elem.textContent = heading;
        row.appendChild(elem);
        return row;
    }, document.createElement("tr"));
    result.appendChild(headingsRow);

    data.forEach(player => {
        result.appendChild(createRow(player));
    });

    return result;
};

/**
 * Add the table to the DOM
 */
const addToDom = elem => {

    document.getElementsByTagName("body")[0].appendChild(elem);
};

/**
 * Start everything off, once loading is complete
 */
window.addEventListener("load", () => {

    getGroup(tournamentId, roundNumber, groupNumber)
        .then(data => ({ result: null, input: data }))
        .then(createPlayerList)
        .then(addResults)
        .then(addPendingCount)
        .then(data => data.result)
        .then(orderPlayers)
        .then(createTable)
        .then(addToDom);
});
