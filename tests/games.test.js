const assert = require('chai').assert;
const axiosHelper = require('./axiosHelper');

// Task 2 - testing the games query
describe('games query tests - happy paths', () => {
  it('can query games and request all available game fields', async () => {
    const queryResponse = await axiosHelper.getGraphQlResponse(
      '{ games { id name slug supplier { id name } } }',
    );

    // NB: To reduce code duplication, a function like the CAPI testQuery could
    // be made that accepts a payload, expected status and expected data / message

    // Ensure a 200 status is received
    assert.strictEqual(queryResponse.status, 200, 'a 200 status was not returned');

    // Ensure atleast one games data is returned
    assert.isAtLeast(
      queryResponse.data.data.games.length,
      1,
      'no games data was returned (less than 1 game present)',
    );

    queryResponse.data.data.games.forEach((game) => {
      // Assert requested fields are present within a game
      ['id', 'name', 'slug'].forEach((field) => {
        assert.nestedProperty(game, field, `a games ${field} was not returned within the game`);
      });

      // Assert requested fields are present within a games supplier
      ['id', 'name'].forEach((field) => {
        assert.nestedProperty(game, field, `a suppliers ${field} was not returned`);
      });
    });
  });

  it('can query games and request a subset of game fields', async () => {
    const queryResponse = await axiosHelper.getGraphQlResponse('{ games { id supplier { id } } }');

    // Ensure a 200 status is received
    assert.strictEqual(queryResponse.status, 200, 'a 200 status was not returned');

    // Ensure atleast one games data is returned
    assert.isAtLeast(
      queryResponse.data.data.games.length,
      1,
      'no games data was returned (less than 1 game present)',
    );

    queryResponse.data.data.games.forEach((game) => {
      // Assert requested fields are present for each game
      assert.nestedProperty(game, 'id', 'a game was not returned with the game id');
      assert.nestedProperty(
        game.supplier,
        'id',
        'a games supplier was not returned with the supplier id',
      );
    });
  });

  // Ensure each valid field can be requested and the response contains the requested item
  tests = [
    {
      field: 'id',
      query: '{ games { id } }',
    },
    {
      field: 'name',
      query: '{ games { name } }',
    },
    {
      field: 'slug',
      query: '{ games { slug } }',
    },
    {
      field: 'supplier id',
      query: '{ games { supplier { id } } }',
    },
    {
      field: 'supplier name',
      query: '{ games { supplier { name } } }',
    },
  ];

  // Run each test in the above table
  tests.forEach((test) => {
    // Define the tests name
    it(`can query games ${test.field}`, async () => {
      // Run the provided query
      const queryResponse = await axiosHelper.getGraphQlResponse(test.query);

      // Ensure a 200 status is received
      assert.strictEqual(queryResponse.status, 200, 'a 200 status was not returned');

      // Define an easier to read variable for the games returned
      const games = queryResponse.data.data.games;

      // Ensure atleast one games data is returned
      assert.isAtLeast(games.length, 1, 'no games data was returned (less than 1 game present)');

      // Ensure the expected field was returned for each game in the response
      games.forEach((game) => {
        switch (test.field) {
          case 'supplier id':
          case 'supplier name':
            assert.nestedProperty(game, 'supplier', 'a games supplier was not returned');
            const property = test.field.split(' ');
            assert.nestedProperty(
              game.supplier,
              property[1],
              `a games supplier was not returned with the supplier ${property[1]}`,
            );
            break;
          default:
            assert.nestedProperty(game, test.field);
        }

        // NB: Here you could also test that the data returned is of the correct type according to the docs
        //  id:   Int!        The numeric ID of a game.
        //  name: String!     The name of the game. This is unique per supplier.
        //  slug: String!     The URL slug to identify the game. This must always be unique.
        //  supplier: Supplier! The game supplier data.
      });
    });
  });
});

describe('games query tests - invalid types', () => {
  tests = [
    {
      name: 'with invalid fields',
      query: '{ games { invalid } }',
      message: 'Cannot query field "invalid" on type "Game".',
    },
    {
      name: 'with no fields',
      query: '{ games { } }',
      message: 'Syntax Error: Expected Name, found "}".',
    },
    {
      name: 'with numbers (as an example of invalid types)',
      query: '{ games { 1 } }',
      message: 'Syntax Error: Expected Name, found Int "1".',
    },
  ];

  // Run each test in the above table
  tests.forEach((test) => {
    // Define the tests name
    it(`cannot query games ${test.name}`, async () => {
      // Run the provided query
      const queryResponse = await axiosHelper.getGraphQlResponse(test.query);

      // Ensure a 400 status is received
      assert.strictEqual(queryResponse.status, 400, 'a 400 status was not returned');

      // Ensure the expected error message is received
      assert.strictEqual(
        queryResponse.data.errors[0].message,
        test.message,
        'the expected error message was not returned',
      );

      // Ensure no games data is returned
      assert.isFalse(
        queryResponse.data.hasOwnProperty('games'),
        'games data was returned unexpectedly',
      );
    });
  });
});

// Notes: you can request a field many times i.e. { games { id id id } }
