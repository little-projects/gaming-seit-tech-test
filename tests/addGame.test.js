const assert = require('chai').assert;
const axiosHelper = require('./axiosHelper');

/**
 * Generate a random string and return it
 * @param {*} length
 */
function generateString(length) {
  // NB: Here, I should check the length provided is a number within bounds

  let result = '';
  const characters = 'QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm';

  // For as many characters as were requested
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
}

/**
 * Get a random game from the service
 */
async function getRandomGame() {
  // NB: this could be improved upon by either, having a function to return all games
  // or having a config file for the all games query which is used in many files
  const allGames = await axiosHelper.getGraphQlResponse(
    '{ games { id name slug supplier { id name } } }',
  );

  // NB: Here, I should check that I got games back
  // in the future, I might also want to check it is not x game

  // Return a random game from the allGames query response
  return allGames.data.data.games[Math.floor(Math.random() * allGames.data.data.games.length)];
}

describe('add game mutation tests - happy path', () => {
  let originalNoGames;
  let originalGameIds;

  // Before the tests run, capture the number of games in the service
  before(async () => {
    const games = await axiosHelper.getGraphQlResponse('{ games { id } }');

    originalNoGames = games.data.data.games.length;
    originalGameIds = games.data.data.games.map((g) => g.id);
  });

  after(async () => {
    // Following the tests in this describe block log the created data
    // should it need to be deleted in a test environment
    const games = await axiosHelper.getGraphQlResponse('{ games { id } }');
    const newGameData = games.data.data.games.filter((g) => !originalGameIds.includes(g.id));

    // Inform the user how many games have been added and the new game details
    console.log(
      `  >>>  INFO: ${
        games.data.data.games.length - originalNoGames
      } game(s) created in addGame.test.js`,
    );
    if (newGameData.length) {
      console.log(`  >>>  with the details: ${JSON.stringify(newGameData)}`);
    }
  });

  it('can add a new game with all the required fields', async () => {
    // Define the test game inputs
    const name = generateString(8);
    const slug = generateString(4);

    // Define the mutation to run
    const mutation = `mutation { addGame(input: {name: "${name}", slug: "${slug}", supplier: 1 } ) { id name slug supplier { id name } } }`;

    // Run the provided mutation
    const response = await axiosHelper.getGraphQlResponse(mutation);

    // Ensure a 200 status is received
    assert.strictEqual(response.status, 200, 'a 200 status was not returned');

    // NB: An alternative would be to capture the ID of the game created
    // and then do a game query to check the game was created as expected
    // const gameId = response.data.data.addGame.id;

    // Ensure the game data added matches the name, slug and supplier info provided
    // NB:  This test could be repeated with a different supplier id to ensure the
    //      correct supplier names are fetched from the app
    assert.deepEqual(
      {
        id: originalNoGames + 1,
        name: name,
        slug: slug,
        supplier: { id: 1, name: "Greeny's Games" },
      },
      response.data.data.addGame,
    );
  });
});

describe('add game mutation tests - unhappy paths', () => {
  it('cannot perform an add game mutation with a slug used by another game', async () => {
    // Get a game that exists in the service
    const randomGame = await getRandomGame();

    // Define the fields for the game input
    const name = generateString(10);
    const slug = randomGame.slug;

    // Define the mutation to run
    const mutation = `mutation { addGame(input: {name: "${name}", slug: "${slug}", supplier: 2 } ) { id name slug supplier { id name } } }`;

    // Run the provided mutation
    const response = await axiosHelper.getGraphQlResponse(mutation);

    // Ensure a 200 status is received, due to a logic error rather than an application error
    assert.strictEqual(response.status, 200, 'a 200 status was not returned');

    // Ensure the expected error message is received
    assert.strictEqual(
      response.data.errors[0].message,
      `The slug "${slug}" already exists! Cannot add this game...`,
      'the expected error message was not returned',
    );
  });

  // NB: note to developer, this test fails because it looks like the slugs provided are the same with a space
  // I would suggest we add a trim so that our users are protected from errors like this?
  it('ERR: cannot perform an add game mutation with a slug used by another game with leading whitespace', async () => {
    // Get a game that exists in the service
    const randomGame = await getRandomGame();

    // Define the fields for the game input
    const name = generateString(10);
    const slug = ' ' + randomGame.slug;

    // Define the mutation to run
    const mutation = `mutation { addGame(input: {name: "${name}", slug: "${slug}", supplier: 2 } ) { id name slug supplier { id name } } }`;

    // Run the provided mutation
    const response = await axiosHelper.getGraphQlResponse(mutation);

    // Ensure a 200 status is received, due to a logic error rather than an application error
    assert.strictEqual(response.status, 200, 'a 200 status was not returned');

    // Ensure the expected error message is received
    assert.strictEqual(
      response.data.errors[0].message,
      `The slug "${slug}" already exists! Cannot add this game...`,
      'the expected error message was not returned',
    );

    // Here is an example of the new game created, although I appreciate the slugs are different it looks like a user error
    // The randomly selected game:  {
    //   id: 32,
    //   name: 'OhgnFtcg',
    //   slug: 'VDSj',
    //   supplier: { id: 1, name: "Greeny's Games" }
    // }
    // The game I just made with a typo:  {
    //   id: 44,
    //   name: 'OhgnFtcgPDWl',
    //   slug: ' VDSj',
    //   supplier: { id: 1, name: "Greeny's Games" }
    // }
  });

  it('cannot perform an add game mutation with an invalid field', async () => {
    // Define the fields for the game input
    const string = generateString(10);

    // Define the mutation to run
    const mutation = `mutation { addGame(input: {name: "${string}", slug: "${string}", category: "SLOTS", supplier: 2 } ) { id } }`;

    // Run the provided mutation
    const response = await axiosHelper.getGraphQlResponse(mutation);

    // Ensure a 400 status is received
    assert.strictEqual(response.status, 400, 'a 400 status was not returned');

    // Ensure the expected error message is received
    // NB: if you enter 'is' rather than 'id' the system assumes you made a typo and the error messages change
    assert.strictEqual(
      response.data.errors[0].message,
      `Field "category" is not defined by type "GameInput".`,
      'the expected error message was not returned',
    );
  });

  // Error: The name of the game should be unique per supplier in the docs - but it is not.
  // The name of the game. This is unique per supplier.
  it('ERR: cannot perform an add game mutation with the name of a game which already exists for that supplier', async () => {
    // NB: note to developer, I have written this test according to the spec which I expect to see and therefore this test fails

    // Get a game that exists in the service
    const randomGame = await getRandomGame();

    // Change the slug to a unique value to ensure the game can be added
    randomGame.slug = generateString(10);

    // Define the mutation to run
    const mutation = `mutation { addGame(input: {name: "${randomGame.name}", slug: "${randomGame.slug}", supplier: "${randomGame.supplier.id}" } ) { id name slug supplier { id name } } }`;

    // Run the provided mutation
    const response = await axiosHelper.getGraphQlResponse(mutation);

    // Here we are seeing (for example)
    // The random game chosen:  {
    //   id: 9,
    //   name: 'Lucky Pots',
    //   slug: 'mNCAxAYuXv',
    //   supplier: { id: 1, name: "Greeny's Games" }
    // }
    // The game just added:  {
    //   id: 13,
    //   name: 'Lucky Pots',
    //   slug: 'mNCAxAYuXv',
    //   supplier: { id: 1, name: "Greeny's Games" }
    // }

    // Ensure a 200 status is received
    assert.strictEqual(response.status, 200, 'a 200 status was not returned');

    // Ensure the expected error message is received
    assert.strictEqual(
      response.data.errors[0].message,
      'The name of the game must be unique per supplier',
      'the expected error message was not returned',
    );
  });

  it('cannot perform an add game mutation with a supplier id not already in the app', async () => {
    // Define the fields for the game input
    const string = generateString(10);
    const randomNo = Math.round(Math.random()) * 20 - 10;
    // NB: note to developer, does it really make sense to have supplier ids as minus numbers?

    // Define the mutation to run
    const mutation = `mutation { addGame(input: {name: "${string}", slug: "${string}", supplier: ${randomNo} } ) { id } }`;

    // Run the provided mutation
    const response = await axiosHelper.getGraphQlResponse(mutation);

    // NB: note to developer, I see the below log line even though this is not a successful operation which is confusing
    // "Adding new game with the following data: [name: AAAAA][slug: AAAAA][supplier: 444]"

    // Ensure a 200 status is received
    assert.strictEqual(response.status, 200, 'a 200 status was not returned');

    // Ensure the expected error message is received
    assert.strictEqual(
      response.data.errors[0].message,
      'Cannot find supplier!',
      'the expected error message was not returned',
    );
  });

  it('cannot perform an add game mutation with a repeated field in the game input', async () => {
    // Define the fields for the game input
    const string = generateString(10);

    // Define the mutation to run - here slug is included twice
    const mutation = `mutation { addGame(input: {name: "${string}", slug: "${string}", slug: "${string}", supplier: 2 } ) { id name slug supplier { id name } } }`;

    // Run the provided mutation
    const response = await axiosHelper.getGraphQlResponse(mutation);

    // Ensure a 400 status is received
    assert.strictEqual(response.status, 400, 'a 400 status was not returned');

    // Ensure the expected error message is received
    assert.strictEqual(
      response.data.errors[0].message,
      `There can be only one input field named "slug".`,
      'the expected error message was not returned',
    );
  });

  it('cannot perform an add game mutation with a missing field', async () => {
    // Define the fields for the game input
    const name = JSON.stringify(generateString(10));

    // Define the mutation to run
    // NB: same again, could move this mutation to a config file
    const mutation = `mutation { addGame(input: {name: ${name}, supplier: 2 } ) { id name } }`;

    // Run the provided mutation
    const response = await axiosHelper.getGraphQlResponse(mutation);

    // Ensure a 200 status is received
    assert.strictEqual(response.status, 400, 'a 400 status was not returned');

    // Ensure the expected error message is received
    assert.strictEqual(
      response.data.errors[0].message,
      `Field "GameInput.slug" of required type "String!" was not provided.`,
      'the expected error message was not returned',
    );
  });

  it('cannot perform an add game mutation with missing game input', async () => {
    // Define the mutation to run
    const mutation = `mutation { addGame(input: { } ) { id name slug supplier { id name } } }`;

    // Run the provided mutation
    const response = await axiosHelper.getGraphQlResponse(mutation);

    // Ensure a 400 status is received
    assert.strictEqual(response.status, 400, 'a 400 status was not returned');

    // NB: I have chosen to ignore the locations
    // Extract the error messages only
    const errorsMessageOnly = response.data.errors.map((e) => ({
      message: e.message,
    }));

    // Ensure the expected error message is received
    assert.includeDeepMembers(
      errorsMessageOnly,
      [
        { message: 'Field "GameInput.name" of required type "String!" was not provided.' },
        { message: 'Field "GameInput.slug" of required type "String!" was not provided.' },
        { message: 'Field "GameInput.supplier" of required type "ID!" was not provided.' },
      ],
      'the expected error messages were not returned',
    );
  });

  // Continuing with expected error cases
  // NB: This has been structured as a table test because the standard mutation is being performed
  // with only a change to the provided input
  tests = [
    {
      // missing name in the game input
      name: 'name field absent',
      input: {
        name: null,
        slug: generateString(10),
        supplierId: 1,
      },
      message: 'Expected value of type "String!", found null.',
    },
    {
      // missing slug in the game input
      name: 'slug field absent',
      input: {
        name: generateString(10),
        slug: null,
        supplierId: 1,
      },
      message: 'Expected value of type "String!", found null.',
    },
    {
      // missing supplier id in the game input
      name: 'supplier id field absent',
      input: {
        name: generateString(10),
        slug: generateString(10),
        supplierId: null,
      },
      message: 'Expected value of type "ID!", found null.',
    },
    {
      // name in the game input is too long
      // NB: when a game appears on site, we may not be able to show such a long game name
      // so I would expect this test to fail. It also appears the opposite is true, a game
      // can be added with a single character name where I would expect atleast 3 or 5.
      name: 'ERR: name field over 50 characters',
      input: {
        name: generateString(51),
        slug: generateString(10),
        supplierId: 1,
      },
      message: 'Expected value name should have less than 50 characters',
    },
    {
      // see above.
      name: 'ERR: slug field over 50 characters',
      input: {
        name: generateString(10),
        slug: generateString(51),
        supplierId: 1,
      },
      message: 'Expected value name should have less than 50 characters',
    },
    {
      // field to input is of the incorrect type
      name: 'name value provided as an incorrect type',
      input: {
        name: 1,
        slug: generateString(10),
        supplierId: 1,
      },
      message: 'String cannot represent a non string value: 1',
    },
    {
      // NB: note to developer, I would expect this test to fail
      name: 'ERR: name value starting with a symbol',
      input: {
        name: "' OR 1 = 1",
        slug: generateString(10),
        supplierId: 1,
      },
      message: 'The provided string starts with a symbol',
    },
    {
      // NB: note to developer, here I was testing minimum name length and also validity of certain symbols
      name: 'ERR: name value containing only symbols',
      input: {
        name: '!=\\`&﷯�',
        slug: generateString(10),
        supplierId: 1,
      },
      message: 'The provided name contains a symbol which is not allowed: \\',
    },
    {
      name: 'slug value provided as an incorrect type',
      input: {
        name: generateString(10),
        slug: 1,
        supplierId: 1,
      },
      message: 'String cannot represent a non string value: 1',
    },
    // Unable to repeat the above test for supplier id due to the fact that it errors
    // when the supplier id is not already in the app
  ];

  tests.forEach((test) => {
    // Define the tests name
    it(`cannot perform the add game mutation with ${test.name}`, async () => {
      const name = JSON.stringify(test.input.name);
      const slug = JSON.stringify(test.input.slug);
      const id = JSON.stringify(test.input.supplierId);

      // Define the mutation to run
      const mutation = `mutation { addGame(input: {name: ${name}, slug: ${slug}, supplier: ${id} } ) { id name slug supplier { id name } } }`;

      // Run the provided mutation
      const response = await axiosHelper.getGraphQlResponse(mutation);

      // Ensure a 400 status is returned
      assert.strictEqual(response.status, 400, 'a 400 status was not returned');

      // Ensure the expected error message is received
      assert.strictEqual(
        response.data.errors[0].message,
        test.message,
        'the expected error message was not returned',
      );
    });
  });
});
