const axios = require('axios').default;

/**
 * Using axios (as a HTTP client for node.js), hit the local GraphQl endpoint
 * with the provided payload and return the response status and data as an object
 * @param {*} payload
 */
async function getGraphQlResponse(payload) {
  const response = await axios({
    method: 'post',
    url: 'http://localhost:4000/graphql',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:4000/graphql',
    },
    data: {
      query: payload,
    },
  }).catch((error) => {
    // If there is a response and a non-200 status
    if (error.response) {
      return error.response;
    } else {
      // Else, if GraphQl does not return anything
      throw error;
    }
  });

  return {
    status: response.status,
    data: response.data,
  };
}

module.exports = { getGraphQlResponse };
