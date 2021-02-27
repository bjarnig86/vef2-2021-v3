import faker from 'faker';
import { query } from './db.js';
import { format } from 'date-fns';

// eslint-disable-next-line no-plusplus
export async function insertFakeData({
  name,
  nationalId,
  comment,
  anonymous,
  signed,
} = {}) {
  let success = true;

  const q = `
    INSERT INTO signatures
      (name, nationalId, comment, anonymous, signed)
    VALUES
      ($1, $2, $3, $4, $5);
  `;
  const values = [name, nationalId, comment, anonymous === 'on', signed];

  try {
    await query(q, values);
  } catch (e) {
    console.error('Error inserting signature', e);
    success = false;
  }

  return success;
}

async function fakerData() {
  for (let i = 0; i < 500; i++) {
    const name = faker.name.findName();
    const nationalId = Math.round(Math.random() * 1000000000 + 1000000000);

    const chance = Math.random();
    const comment = chance < 0.5 ? faker.lorem.sentence() : '';
    const anonymous = chance < 0.5 ? 'off' : 'on';
    const date = Date.now();
    const lastTwoWeeks = Math.round(Math.random() * 1209600000);
    const inLastTwoWeeks = date - lastTwoWeeks;
    const signed = format(inLastTwoWeeks, 'dd.MM.yyyy');
    const fakeData = {
      name,
      nationalId,
      comment,
      anonymous,
      signed,
    };

    try {
      // eslint-disable-next-line no-await-in-loop
      await insertFakeData(fakeData);
    } catch (error) {
      console.error(error);
    }
  }
}

fakerData().catch((err) => {
  console.error('Error inserting fake data', err);
});
