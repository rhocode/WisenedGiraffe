import lf from 'lovefield';
/** @namespace lf.Type */
const schemaBuilder = lf.schema.create('test', 5);

schemaBuilder.createTable('node_type')
  .addColumn('id', lf.Type.INTEGER)
  .addPrimaryKey(['id'])
  .addColumn('hidden', lf.Type.BOOLEAN)
  .addColumn('name', lf.Type.STRING);

schemaBuilder.createTable('machine_node_type')
  .addColumn('id', lf.Type.INTEGER)
  .addPrimaryKey(['id'])
  .addColumn('name', lf.Type.STRING)
  .addColumn('hidden', lf.Type.BOOLEAN);

schemaBuilder.createTable('machine_version')
  .addColumn('id', lf.Type.INTEGER)
  .addPrimaryKey(['id'])
  .addColumn('hidden', lf.Type.BOOLEAN)
  .addColumn('color', lf.Type.STRING)
  .addNullable(['color'])
  .addColumn('name', lf.Type.STRING);

schemaBuilder.createTable('machine_class')
  .addColumn('id', lf.Type.INTEGER)
  .addPrimaryKey(['id'])
  .addColumn('name', lf.Type.STRING)
  .addColumn('icon', lf.Type.STRING)
  .addNullable(['icon'])
  .addColumn('hidden', lf.Type.BOOLEAN)
  .addColumn('plural', lf.Type.STRING);

schemaBuilder.createTable('machine_node')
  .addColumn('id', lf.Type.INTEGER)
  .addColumn('speed', lf.Type.INTEGER)
  .addColumn('power', lf.Type.INTEGER)
  .addNullable(['power'])
  .addPrimaryKey(['id'])
  .addColumn('name', lf.Type.STRING)
  .addColumn('hidden', lf.Type.BOOLEAN)
  .addColumn('node_type_id', lf.Type.STRING)
  .addColumn('icon', lf.Type.STRING);


schemaBuilder.createTable('path_type')
  .addColumn('id', lf.Type.INTEGER)
  .addPrimaryKey(['id'])
  .addColumn('name', lf.Type.STRING)
  .addColumn('speed', lf.Type.INTEGER)
  .addColumn('machine_class_id', lf.Type.INTEGER)
  .addNullable(['machine_class_id'])
  .addColumn('hidden', lf.Type.BOOLEAN);

schemaBuilder.createTable('purity_type')
  .addColumn('id', lf.Type.INTEGER)
  .addPrimaryKey(['id'])
  .addColumn('name', lf.Type.STRING)
  .addColumn('hidden', lf.Type.BOOLEAN)
  .addColumn('quantity', lf.Type.INTEGER);

schemaBuilder.createTable('spring_type')
  .addColumn('id', lf.Type.INTEGER)
  .addPrimaryKey(['id'])
  .addColumn('name', lf.Type.STRING)
  .addColumn('hidden', lf.Type.BOOLEAN);

schemaBuilder.createTable('spring')
  .addColumn('id', lf.Type.INTEGER)
  .addPrimaryKey(['id'])
  .addColumn('spring_type_id', lf.Type.INTEGER)
  .addColumn('machine_class_id', lf.Type.INTEGER)
  .addColumn('item_id', lf.Type.INTEGER)
  .addColumn('icon', lf.Type.STRING)
  .addNullable(['item_id', 'icon'])
  .addColumn('hidden', lf.Type.BOOLEAN)
  .addColumn('purities', lf.Type.OBJECT);

schemaBuilder.createTable('item')
  .addColumn('id', lf.Type.INTEGER)
  .addPrimaryKey(['id'])
  .addColumn('name', lf.Type.STRING)
  .addColumn('icon', lf.Type.STRING)
  .addColumn('hidden', lf.Type.BOOLEAN);

schemaBuilder.createTable('recipe')
  .addColumn('id', lf.Type.INTEGER)
  .addPrimaryKey(['id'])
  .addColumn('name', lf.Type.STRING)
  .addColumn('inputs', lf.Type.OBJECT)
  .addColumn('machine_class_id', lf.Type.INTEGER)
  .addColumn('item_id', lf.Type.INTEGER) // The output Item Id
  .addColumn('time', lf.Type.INTEGER)
  .addColumn('quantity', lf.Type.INTEGER)
  .addColumn('power', lf.Type.INTEGER)
  .addColumn('hidden', lf.Type.BOOLEAN)
  .addColumn('player_unlock_id', lf.Type.INTEGER)
  .addColumn('icon', lf.Type.STRING)
  .addNullable(['item_id', 'icon','player_unlock_id']);

schemaBuilder.createTable('player_unlock')
  .addColumn('id', lf.Type.INTEGER)
  .addPrimaryKey(['id'])
  .addColumn('name', lf.Type.STRING)
  .addColumn('hidden', lf.Type.BOOLEAN);

const getTableEntryIdByName = (table, name) => {
  return (db) => {
    const tableRef = db.getSchema().table(table);
    return new Promise((resolve, reject) => {
      db.select().from(tableRef).where(tableRef.name.eq(name)).exec()
        .then((rows) => {
          if(rows.length == 1) {
            resolve(rows[0].id);
          } else {
            reject('No element found or too many matching rows: ' + table+ ' ' + name + ' ' + rows);
          }
        });
    });
  };
};

const getTableEntries = (table, db) => {
  const tableRef = db.getSchema().table(table);
  return new Promise((resolve) => {
    db.select().from(tableRef).exec()
      .then((rows) => {
        resolve(rows);
      });
  });
};

const baseUrl = 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/';

const parseRecipeIngredients = recipes => {
  return async db => {
    for (let i = 0 ; i < recipes.length; i++) {
      const recipe = recipes[i];
      const keys = Object.keys(recipe);
      for (let j = 0 ; j < keys.length; j++) {
        const item = recipe[keys[j]];
        if (typeof item == 'function') {
          recipe[keys[j]] = await item(db);
        }
      }
    }

    return recipes;
  };
};

const generateSpringList = async db => {
  const ret = [];
  const types = ['Coal Ore', 'Iron Ore', 'Limestone Ore', 'Copper Ore'];
  const machine_type_miner = await getTableEntryIdByName('machine_class', 'Miner')(db);
  const machine_type_container = await getTableEntryIdByName('machine_class', 'Container')(db);
  const spring_type_miner = await getTableEntryIdByName('spring_type', 'Miner')(db);
  const spring_type_container = await getTableEntryIdByName('spring_type', 'Container')(db);
  const purity_types = await getTableEntries('purity_type', db);
  for (let i = 0; i < types.length; i++) {
    const ore = await getTableEntryIdByName('item', types[i])(db);

    const structure = {
      item_id: ore,
      machine_class_id: machine_type_miner,
      spring_type_id: spring_type_miner,
      purities: purity_types
    };
    ret.push(structure);
  }

  const container  = {
    machine_class_id: machine_type_container,
    spring_type_id: spring_type_container
  };

  ret.push(container);

  return ret;
};

const data = [
  {
    key: 'purity_type',
    value: [
      {name: 'Impure', quantity: 30},
      {name: 'Normal', quantity: 60},
      {name: 'Pure', quantity: 120}
    ]
  },
  { key: 'item',
    value: [
      {
        name: 'Copper Ore',
        icon: baseUrl + 'Copper_Ore.png'
      },
      {
        name: 'Iron Ore',
        icon: baseUrl + 'Iron_Ore.png'
      },
      {
        name: 'Limestone Ore',
        icon: baseUrl + 'Limestone.png'
      },
      {
        name: 'Coal Ore',
        icon: baseUrl + 'Coal.png'
      },
      {
        name: 'Iron Ingot',
        icon: baseUrl + 'Iron_Ingot.png'
      },
      {
        name: 'Copper Ingot',
        icon: baseUrl + 'Copper_Ingot.png'
      },
      {
        name: 'Iron Plate',
        icon: baseUrl + 'Iron_Plate.png'
      },
      {
        name: 'Iron Rod',
        icon: baseUrl + 'Iron_Rod.png'
      },
      {
        name: 'Screw',
        icon: baseUrl + 'Screw.png'
      },
      {
        name: 'Wire',
        icon: baseUrl + 'Wire.png'
      },
      {
        name: 'Cable',
        icon: baseUrl + 'Cable.png'
      },
      {
        name: 'Concrete',
        icon: baseUrl + 'Concrete.png'
      },
      {
        name: 'Reinforced Iron Plate',
        icon: baseUrl + 'Reinforced_Iron_Plate.png'
      },
      {
        name: 'Modular Frame',
        icon: baseUrl + 'Modular_Frame.png'
      },
      {
        name: 'Rotor',
        icon: baseUrl + 'Rotor.png'
      },
    ]
  },
  { key: 'node_type',
    value: [
      {name: 'Machine Node'},
      {name: 'Resource Node'},
    ]
  },
  { key: 'machine_version',
    value: [
      {name: 'internal'},
      {name: 'Mk.1'},
      {name: 'Mk.2'},
      {name: 'Mk.3'},
      {name: 'Mk.4'},
      {name: 'Mk.5'},
      {name: 'Mk.6'},
    ]
  },
  {
    key: 'path_type',
    value: [
      {name: 'Item Belt Mk 1',
        speed: 60,
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1')
      },
      {name: 'Item Belt Mk 2',
        speed: 120,
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.2')
      },
      {name: 'Item Belt Mk 3',
        speed: 270,
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.3')
      },
      {name: 'Item Belt Mk 4',
        speed: 450,
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.4')
      },
      {name: 'Item Belt Mk 5',
        speed: 6600,
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.5')
      },
      {name: 'Item Belt Mk 6',
        speed: 900,
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.6')
      },
      {name: 'internal',
        speed: 9999999,
        machine_version_id: getTableEntryIdByName('machine_version', 'internal')
      },
    ]
  },
  {
    key: 'machine_class',
    value: [
      {name: 'Constructor', plural: 'Constructors', icon: baseUrl + 'Constructor.png'},
      {name: 'Miner', plural: 'Miners', icon: baseUrl + 'Miner_MK1.png'},
      {name: 'Assembler', plural: 'Assemblers', icon: baseUrl + 'Assembler.png'},
      {name: 'Smelter', plural: 'Smelters', icon: baseUrl + 'Smelter.png'},
      {name: 'Coal Generator', plural: 'Coal Generators', icon: baseUrl + 'Coal_Generator.png'},
      {name: 'Manufacturer', plural: 'Manufacturer', icon: baseUrl + 'Manufacturer.png'},
      {name: 'Container', plural: 'Containers', icon: baseUrl + 'Storage_Container_MK1.png'},
      {name: 'Logistic', plural: 'Logistics', icon: baseUrl + 'Splitter.png'},
    ]
  },
  { key: 'machine_node',
    value: [
      { name: 'Splitter',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Logistic'),
        speed: 100,
        icon: baseUrl + 'Splitter.png'
      },
      { name: 'Merger',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Logistic'),
        speed: 100,
        icon: baseUrl + 'Merger.png'
      },
      { name: 'Miner Mk.1',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Miner'),
        speed: 100,
        power: 5,
        icon: baseUrl + 'Miner_MK1.png'
      },
      { name: 'Miner Mk.2',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.2'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Miner'),
        icon: baseUrl + 'Miner_MK2.png',
        speed: 200,
        power: 5,
        hidden: true
      },
      { name: 'Smelter Mk.1',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Smelter'),
        speed: 100,
        icon: baseUrl + 'Smelter.png'
      },
      { name: 'Smelter Mk.2',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.2'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Smelter'),
        icon: baseUrl + 'Smelter.png',
        speed: 100,
        hidden: true
      },
      { name: 'Constructor Mk.1',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        icon: baseUrl + 'Constructor.png',
        speed: 100,
      },
      { name: 'Constructor Mk.2',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.2'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        icon: baseUrl + 'Constructor.png',
        speed: 100,
        hidden: true
      },
      { name: 'Assembler Mk.1',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Assembler'),
        icon: baseUrl + 'Assembler.png',
        speed: 100,
      },
      { name: 'Assembler Mk.2',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.2'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Assembler'),
        icon: baseUrl + 'Assembler.png',
        speed: 100,
        hidden: true
      },
      { name: 'Manufacturer Mk.1',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Manufacturer'),
        icon: '',
        speed: 100,
        hidden: true
      },
      { name: 'Manufacturer Mk.2',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.2'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Manufacturer'),
        icon: '',
        speed: 100,
        hidden: true
      },
      { name: 'Coal Generator',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Coal Generator'),
        icon: '',
        speed: 100,
        hidden: true
      }
    ]
  },
  {
    key: 'spring_type',
    value: [
      {name: 'Miner'},
      {name: 'Container'}
    ]
  },
  {
    key: 'player_unlock',
    value: [
      { name: 'Hard Drive: Alternative Reinforced Iron Plate' }
    ]
  },
  {
    key: 'spring',
    value: generateSpringList
  },
  {
    key: 'recipe',
    value: [
      {
        name: 'Iron Ingot',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Iron Ore'),
          quantity: 1
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Smelter'),
        item_id: getTableEntryIdByName('item', 'Iron Ingot'),
        time: 2,
        power: 4,
        quantity: 1
      },
      {
        name: 'Copper Ingot',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Copper Ore'),
          quantity: 1
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Smelter'),
        item_id: getTableEntryIdByName('item', 'Copper Ingot'),
        time: 2,
        power: 4,
        quantity: 1
      },
      {
        name: 'Iron Plate',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Iron Ingot'),
          quantity: 12
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        item_id: getTableEntryIdByName('item', 'Iron Plate'),
        time: 4,
        power: 4,
        quantity: 1
      },
      {
        name: 'Iron Rod',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Iron Ingot'),
          quantity: 1
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        item_id: getTableEntryIdByName('item', 'Iron Rod'),
        time: 4,
        power: 4,
        quantity: 1
      },
      {
        name: 'Wire',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Copper Ingot'),
          quantity: 1
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        item_id: getTableEntryIdByName('item', 'Wire'),
        time: 4,
        power: 4,
        quantity: 3
      },
      {
        name: 'Cable',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Wire'),
          quantity: 2
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        item_id: getTableEntryIdByName('item', 'Cable'),
        time: 4,
        power: 4,
        quantity: 1
      },
      {
        name: 'Screw',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Iron Rod'),
          quantity: 1
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        item_id: getTableEntryIdByName('item', 'Screw'),
        time: 4,
        power: 4,
        quantity: 6
      },
      { // Find out better naming
        name: 'Alternate Screw',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Iron Ingot'),
          quantity: 2
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        item_id: getTableEntryIdByName('item', 'Screw'),
        time: 8,
        power: 4,
        quantity: 12,
        hidden: true
      },
      {
        name: 'Concrete',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Limestone Ore'),
          quantity: 3
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        item_id: getTableEntryIdByName('item', 'Concrete'),
        time: 4,
        power: 4,
        quantity: 1
      },
      {
        name: 'Reinforced Iron Plate',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Iron Plate'),
          quantity: 4
        }, {
          item_id: getTableEntryIdByName('item', 'Screw'),
          quantity: 24
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Assembler'),
        item_id: getTableEntryIdByName('item', 'Reinforced Iron Plate'),
        time: 12,
        power: 15,
        quantity: 1,
      },
      {
        name: 'Alternative Reinforced Iron Plate',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Iron Plate'),
          quantity: 10
        }, {
          item_id: getTableEntryIdByName('item', 'Screw'),
          quantity: 24
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Assembler'),
        item_id: getTableEntryIdByName('item', 'Reinforced Iron Plate'),
        time: 24,
        power: 15,
        quantity: 3,
        hidden: true
      },
      {
        name: 'Rotor',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Iron Rod'),
          quantity: 3
        }, {
          item_id: getTableEntryIdByName('item', 'Screw'),
          quantity: 22
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Assembler'),
        item_id: getTableEntryIdByName('item', 'Rotor'),
        time: 10,
        power: 15,
        quantity: 1,
      },
      {
        name: 'Modular Frame',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Reinforced Iron Plate'),
          quantity: 3
        }, {
          item_id: getTableEntryIdByName('item', 'Iron Rod'),
          quantity: 6
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Assembler'),
        item_id: getTableEntryIdByName('item', 'Modular Frame'),
        time: 15,
        power: 15,
        quantity: 1,
      }
    ]
  }
];

const createDatabase = () => {
  const createDB = async () => {
    const p = schemaBuilder.connect().then(async db => {
      const schema = db.getSchema();
      const promiseList = [];

      for(let i = 0; i < data.length; i++) {
        const obj = data[i];
        const key = obj.key;
        const table = schema.table(key);
        const rows = [];
        const valuePromiseRows = [];

        if (typeof obj.value == 'function') {
          const value = await obj.value(db);
          value.forEach((row, index) => {
            row.hidden = row.hidden || false;
            row.id = index;
            rows.push(table.createRow(row));
          });
        } else {
          for (let j = 0; j < obj.value.length; j++) {
            const index = j;
            const row = obj.value[j];
            row.hidden = row.hidden || false;
            row.id = index;

            const blockingPromises = Object.keys(row).map( async k => {
              if (typeof row[k] == 'function') {
                row[k] = await row[k](db);
              }
              return Promise.resolve();
            });

            await Promise.all(blockingPromises);
            rows.push(table.createRow(row));
            valuePromiseRows.push(Promise.resolve());
          }
        }

        await Promise.all(valuePromiseRows);
        await db.insertOrReplace().into(table).values(rows).exec();
        console.log('Loaded ' + rows.length + ' into ' +  key);
      }
      await Promise.all(promiseList);
      return db;
    });

    return await p;
  };
  return createDB();
};

export default createDatabase;