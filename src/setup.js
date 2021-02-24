import { promises } from 'fs';
import faker from 'faker';
import { readFile } from 'fs/promises';
import { query, end } from './db.js';
import { insert } from './db.js';

const schemaFile = './sql/schema.sql';

async function create() {
  const data = await readFile(schemaFile);

  await query(data.toString('utf-8'));

  await end();

  console.info('Schema created');
}

create().catch((err) => {
  console.error('Error creating schema', err);
});

// eslint-disable-next-line no-plusplus
for (let i = 0; i < 501; i++) {
  const name = faker.fake.name();
  const nationalId = Math.parseInt(Math.random() * 1000000000 + 1000000000);

  const chance = Math.random();
  const comment = chance < 0.5 ? faker.lorem.sentence() : '';
  const anonymous = chance < 0.5 ? 'on' : 'off';
  const fakeData = {
    name,
    nationalId,
    comment,
    anonymous,
  };

  try {
    insert(fakeData);
  } catch (error) {
    console.error(error);
  }
}
