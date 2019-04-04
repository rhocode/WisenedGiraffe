import lf from 'lovefield';

/** @namespace lf.Type */
const schemaBuilder = lf.schema.create('test', 6);

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
  .addColumn('rank', lf.Type.INTEGER)
  .addColumn('representation', lf.Type.STRING)
  .addColumn('name', lf.Type.STRING)
  .addNullable(['color', 'rank']);

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
  .addColumn('icon', lf.Type.STRING)
  .addColumn('input_slots', lf.Type.INTEGER)
  .addColumn('output_slots', lf.Type.INTEGER);


schemaBuilder.createTable('path_type')
  .addColumn('id', lf.Type.INTEGER)
  .addPrimaryKey(['id'])
  .addColumn('name', lf.Type.STRING)
  .addColumn('speed', lf.Type.INTEGER)
  .addColumn('rank', lf.Type.INTEGER)
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
  .addNullable(['item_id', 'icon', 'player_unlock_id']);

schemaBuilder.createTable('player_unlock')
  .addColumn('id', lf.Type.INTEGER)
  .addPrimaryKey(['id'])
  .addColumn('name', lf.Type.STRING)
  .addColumn('chip_name', lf.Type.STRING)
  .addNullable(['chip_name'])
  .addColumn('hidden', lf.Type.BOOLEAN);

const getTableEntryIdByName = (table, name) => {
  return (db) => {
    const tableRef = db.getSchema().table(table);
    return new Promise((resolve, reject) => {
      db.select().from(tableRef).where(tableRef.name.eq(name)).exec()
        .then((rows) => {
          if (rows.length == 1) {
            resolve(rows[0].id);
          } else {
            reject('No element found or too many matching rows: ' + table + '|' + name + '|' + rows);
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
    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      const keys = Object.keys(recipe);
      for (let j = 0; j < keys.length; j++) {
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
  const types = ['Coal Ore', 'Iron Ore', 'Limestone Ore', 'Copper Ore', 'Caterium Ore'];
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

  const container = {
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
  {
    key: 'item',
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
      {
        name: 'Caterium Ore',
        icon: baseUrl + 'Caterium_Ore.png'
      },
      {
        name: 'Caterium Ingot',
        icon: baseUrl + 'Caterium_Ingot.png'
      },
      {
        name: 'Quickwire',
        icon: baseUrl + 'Quickwire.png'
      },
      {
        name: 'Steel Ingot',
        icon: baseUrl + 'Steel_Ingot.png'
      },
      {
        name: 'Steel Beam',
        icon: baseUrl + 'Steel_Beam.png'
      },
      {
        name: 'Steel Pipe',
        icon: baseUrl + 'Steel_Pipe.png'
      },
      {
        name: 'Encased Industrial Beam',
        icon: baseUrl + 'Encased_Industrial_Beam.png'
      },
      {
        name: 'Stator',
        icon: baseUrl + 'Stator.png'
      },
      {
        name: 'Heavy Modular Frame',
        icon: baseUrl + 'Heavy_Modular_Frame.png'
      },
      {
        name: 'Motor',
        icon: baseUrl + 'Motor.png'
      }
    ]
  },
  {
    key: 'node_type',
    value: [
      {name: 'Machine Node'},
      {name: 'Resource Node'},
    ]
  },
  {
    key: 'machine_version',
    value: [
      {name: 'internal', representation: ''},
      {name: 'Mk.1', rank: 0, representation: 'I'},
      {name: 'Mk.2', rank: 1, representation: 'II'},
      {name: 'Mk.3', rank: 2, representation: 'III'},
      {name: 'Mk.4', rank: 3, representation: 'VI'},
      {name: 'Mk.5', rank: 4, representation: 'V'},
      {name: 'Mk.6', rank: 5, representation: 'IV'},
      {name: 'S', rank: 6, representation: 'S'}, // For Splitters
      {name: 'M', rank: 7, representation: 'M'},
    ]
  },
  {
    key: 'path_type',
    value: [
      {
        name: 'Item Belt Mk 1',
        speed: 60,
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        rank: 0
      },
      {
        name: 'Item Belt Mk 2',
        speed: 120,
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.2'),
        rank: 1
      },
      {
        name: 'Item Belt Mk 3',
        speed: 270,
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.3'),
        rank: 2
      },
      {
        name: 'Item Belt Mk 4',
        speed: 450,
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.4'),
        rank: 3
      },
      {
        name: 'Item Belt Mk 5',
        speed: 6600,
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.5'),
        rank: 4
      },
      {
        name: 'Item Belt Mk 6',
        speed: 900,
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.6'),
        rank: 5
      },
      {
        name: 'internal',
        speed: 9999999,
        machine_version_id: getTableEntryIdByName('machine_version', 'internal'),
        rank: -1
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
      {name: 'Foundry', plural: 'Foundries', icon: baseUrl + 'Foundry_MK1.png'}
    ]
  },
  {
    key: 'machine_node',
    value: [
      {
        name: 'Container',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Container'),
        speed: 999999,
        icon: baseUrl + 'Storage_Container_MK1.png',
        input_slots: 1,
        output_slots: 1
      },
      {
        name: 'Splitter',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'S'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Logistic'),
        speed: 999999,
        icon: baseUrl + 'Splitter.png',
        input_slots: 1,
        output_slots: 3
      },
      {
        name: 'Merger',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'M'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Logistic'),
        speed: 999999,
        icon: baseUrl + 'Merger.png',
        input_slots: 3,
        output_slots: 1
      },
      {
        name: 'Miner Mk.1',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Miner'),
        speed: 100,
        power: 5,
        icon: baseUrl + 'Miner_MK1.png'
        ,
        input_slots: 0,
        output_slots: 1
      },
      {
        name: 'Miner Mk.2',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.2'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Miner'),
        icon: baseUrl + 'Miner_MK2.png',
        speed: 200,
        power: 5,
        hidden: true
        ,
        input_slots: 0,
        output_slots: 1
      },
      {
        name: 'Smelter Mk.1',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Smelter'),
        speed: 100,
        icon: baseUrl + 'Smelter.png'
        ,
        input_slots: 1,
        output_slots: 1
      },
      {
        name: 'Smelter Mk.2',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.2'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Smelter'),
        icon: baseUrl + 'Smelter.png',
        speed: 100,
        hidden: true
        ,
        input_slots: 1,
        output_slots: 1
      },
      {
        name: 'Constructor Mk.1',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        icon: baseUrl + 'Constructor.png',
        speed: 100,
        input_slots: 1,
        output_slots: 1
      },
      {
        name: 'Constructor Mk.2',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.2'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        icon: baseUrl + 'Constructor.png',
        speed: 100,
        hidden: true,
        input_slots: 1,
        output_slots: 1
      },
      {
        name: 'Assembler Mk.1',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Assembler'),
        icon: baseUrl + 'Assembler.png',
        speed: 100,
        input_slots: 2,
        output_slots: 1
      },
      {
        name: 'Assembler Mk.2',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.2'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Assembler'),
        icon: baseUrl + 'Assembler.png',
        speed: 100,
        hidden: true,
        input_slots: 2,
        output_slots: 1
      },
      {
        name: 'Manufacturer Mk.1',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Manufacturer'),
        icon: '',
        speed: 100,
        hidden: true,
        input_slots: 4,
        output_slots: 1
      },
      {
        name: 'Manufacturer Mk.2',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.2'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Manufacturer'),
        icon: '',
        speed: 100,
        hidden: true,
        input_slots: 4,
        output_slots: 1
      },
      {
        name: 'Coal Generator',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Coal Generator'),
        icon: baseUrl + 'Coal_Generator.png',
        speed: 100,
        hidden: true,
        input_slots: 1,
        output_slots: 0
      },
      {
        name: 'Foundry Mk.1',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.1'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Foundry'),
        icon: baseUrl + 'Foundry_MK1.png',
        speed: 100,
        hidden: true,
        input_slots: 2,
        output_slots: 1
      },
      {
        name: 'Foundry Mk.2',
        node_type_id: getTableEntryIdByName('node_type', 'Machine Node'),
        machine_version_id: getTableEntryIdByName('machine_version', 'Mk.2'),
        machine_class_id: getTableEntryIdByName('machine_class', 'Foundry'),
        icon: baseUrl + 'Foundry_MK2.png', //TODO get MK2 icon
        speed: 100,
        hidden: true,
        input_slots: 2,
        output_slots: 1
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
      {name: 'Reinforced Iron Plate (Alt.)'},
      {name: 'Stitched Iron Plate'},
      {name: 'Caterium Wire'},
      {name: 'Encased Industrial Beam (Alt.)'},
      {name: 'Heavy Modular Frame (Alt.)'},
      {name: 'Iron Ingot (Alt.)'},
      {name: 'Iron Wire'},
      {name: 'Modular Frame (Alt.)'},
      {name: 'Rotor (Alt.)'},
      {name: 'Stator (Alt.)'},
      {name: 'Steel Ingot (Alt.)'},
      {name: 'Screw (Alt.)'},
      // {name: 'Rubber Cable'},
      // {name: 'Circuit Board'},
      // {name: 'Caterium Computer'},
      {name: 'Quickwire (Alt.)'},
      // {name: 'Caterium Circuit Board'},
      // {name: 'Crystal Computer'}
      // time = output_quantity * 60 / ppm
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
        name: 'Caterium Ingot',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Caterium Ore'),
          quantity: 4
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Smelter'),
        item_id: getTableEntryIdByName('item', 'Caterium Ingot'),
        time: 4,
        power: 4,
        quantity: 1,
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
        name: 'Iron Wire',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Iron Ingot'),
          quantity: 2
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        item_id: getTableEntryIdByName('item', 'Wire'),
        time: 8,
        power: 4,
        quantity: 9,
        hidden: true,
        player_unlock_id: getTableEntryIdByName('player_unlock', 'Iron Wire')
      },
      {
        name: 'Caterium Wire',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Caterium Ingot'),
          quantity: 1
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        item_id: getTableEntryIdByName('item', 'Wire'),
        time: 8,
        power: 4,
        quantity: 9,
        hidden: true,
        player_unlock_id: getTableEntryIdByName('player_unlock', 'Caterium Wire')
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
      {
        name: 'Screw (Alt.)',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Iron Ingot'),
          quantity: 2
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        item_id: getTableEntryIdByName('item', 'Screw'),
        time: 8,
        power: 4,
        quantity: 12,
        hidden: true,
        player_unlock_id: getTableEntryIdByName('player_unlock', 'Screw (Alt.)')
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
        name: 'Reinforced Iron Plate (Alt.)',
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
        hidden: true,
        player_unlock_id: getTableEntryIdByName('player_unlock', 'Reinforced Iron Plate (Alt.)')
      },
      {
        name: 'Stitched Iron Plate',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Iron Plate'),
          quantity: 6
        }, {
          item_id: getTableEntryIdByName('item', 'Wire'),
          quantity: 30
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Assembler'),
        item_id: getTableEntryIdByName('item', 'Reinforced Iron Plate'),
        time: 24,
        power: 15,
        quantity: 3,
        hidden: true,
        player_unlock_id: getTableEntryIdByName('player_unlock', 'Stitched Iron Plate')
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
        name: 'Rotor (Alt.)',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Steel Pipe'),
          quantity: 6
        }, {
          item_id: getTableEntryIdByName('item', 'Wire'),
          quantity: 20
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Assembler'),
        item_id: getTableEntryIdByName('item', 'Rotor'),
        time: 20,
        power: 15,
        quantity: 3,
        hidden: true,
        player_unlock_id: getTableEntryIdByName('player_unlock', 'Rotor (Alt.)')
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
      },
      {
        name: 'Modular Frame (Alt.)',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Reinforced Iron Plate'),
          quantity: 6
        }, {
          item_id: getTableEntryIdByName('item', 'Steel Pipe'),
          quantity: 6
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Assembler'),
        item_id: getTableEntryIdByName('item', 'Modular Frame'),
        time: 30,
        power: 15,
        quantity: 3,
        hidden: true,
        player_unlock_id: getTableEntryIdByName('player_unlock', 'Modular Frame (Alt.)')
      },
      {
        name: 'Encased Industrial Beam',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Steel Beam'),
          quantity: 4
        }, {
          item_id: getTableEntryIdByName('item', 'Concrete'),
          quantity: 5
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Assembler'),
        item_id: getTableEntryIdByName('item', 'Encased Industrial Beam'),
        time: 15,
        power: 15,
        quantity: 1,
      },
      {
        name: 'Encased Industrial Beam (Alt.)',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Steel Pipe'),
          quantity: 18
        }, {
          item_id: getTableEntryIdByName('item', 'Concrete'),
          quantity: 10
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Assembler'),
        item_id: getTableEntryIdByName('item', 'Encased Industrial Beam'),
        time: 30,
        power: 15,
        quantity: 3,
        hidden: true,
        player_unlock_id: getTableEntryIdByName('player_unlock', 'Encased Industrial Beam (Alt.)')
      },
      {
        name: 'Heavy Modular Frame',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Modular Frame'),
          quantity: 5
        }, {
          item_id: getTableEntryIdByName('item', 'Encased Industrial Beam'),
          quantity: 5
        }, {
          item_id: getTableEntryIdByName('item', 'Steel Pipe'),
          quantity: 15
        }, {
          item_id: getTableEntryIdByName('item', 'Screw'),
          quantity: 90
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Manufacturer'),
        item_id: getTableEntryIdByName('item', 'Heavy Modular Frame'),
        time: 30,
        power: 60,
        quantity: 1,
      },
      {
        name: 'Heavy Modular Frame (Alt.)',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Modular Frame'),
          quantity: 8
        }, {
          item_id: getTableEntryIdByName('item', 'Encased Industrial Beam'),
          quantity: 10
        }, {
          item_id: getTableEntryIdByName('item', 'Steel Pipe'),
          quantity: 36
        }, {
          item_id: getTableEntryIdByName('item', 'Concrete'),
          quantity: 25
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Manufacturer'),
        item_id: getTableEntryIdByName('item', 'Heavy Modular Frame'),
        time: 64, //TODO
        power: 60,
        quantity: 3,
        hidden: true,
        player_unlock_id: getTableEntryIdByName('player_unlock', 'Heavy Modular Frame (Alt.)')
      },
      {
        name: 'Iron Ingot (Alt.)',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Iron Ore'),
          quantity: 1
        }, {
          item_id: getTableEntryIdByName('item', 'Copper Ore'),
          quantity: 1
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Foundry'),
        item_id: getTableEntryIdByName('item', 'Iron Ingot'),
        time: 4,
        power: 4,
        quantity: 3,
        hidden: true,
        player_unlock_id: getTableEntryIdByName('player_unlock', 'Iron Ingot (Alt.)')
      },
      {
        name: 'Steel Ingot',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Iron Ore'),
          quantity: 3
        }, {
          item_id: getTableEntryIdByName('item', 'Coal Ore'),
          quantity: 3
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Foundry'),
        item_id: getTableEntryIdByName('item', 'Steel Ingot'),
        time: 4,
        power: 12,
        quantity: 2,
      },
      {
        name: 'Steel Ingot (Alt.)',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Iron Ingot'),
          quantity: 3
        }, {
          item_id: getTableEntryIdByName('item', 'Coal Ore'),
          quantity: 6
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Foundry'),
        item_id: getTableEntryIdByName('item', 'Steel Ingot'),
        time: 8,
        power: 12,
        quantity: 6,
        hidden: true,
        player_unlock_id: getTableEntryIdByName('player_unlock', 'Steel Ingot (Alt.)')
      },
      {
        name: 'Steel Beam',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Steel Ingot'),
          quantity: 3
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        item_id: getTableEntryIdByName('item', 'Steel Beam'),
        time: 6,
        power: 4,
        quantity: 1,
      },
      {
        name: 'Steel Pipe',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Steel Ingot'),
          quantity: 1
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        item_id: getTableEntryIdByName('item', 'Steel Pipe'),
        time: 4,
        power: 4,
        quantity: 1,
      },
      {
        name: 'Quickwire',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Caterium Ingot'),
          quantity: 1
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Constructor'),
        item_id: getTableEntryIdByName('item', 'Quickwire'),
        time: 4,
        power: 4,
        quantity: 4,
      },
      {
        name: 'Quickwire (Alt.)',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Caterium Ingot'),
          quantity: 1
        }, {
          item_id: getTableEntryIdByName('item', 'Copper Ingot'),
          quantity: 2
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Assembler'),
        item_id: getTableEntryIdByName('item', 'Quickwire'),
        time: 8,
        power: 4,
        quantity: 12,
        hidden: true,
        player_unlock_id: getTableEntryIdByName('player_unlock', 'Quickwire (Alt.)')
      },
      {
        name: 'Motor',
        inputs: parseRecipeIngredients([{
          item_id: getTableEntryIdByName('item', 'Rotor'),
          quantity: 2
        }, {
          item_id: getTableEntryIdByName('item', 'Stator'),
          quantity: 2
        }]),
        machine_class_id: getTableEntryIdByName('machine_class', 'Assembler'),
        item_id: getTableEntryIdByName('item', 'Motor'),
        time: 12,
        power: 15,
        quantity: 1,
      },
    ]
  }
];

const createDatabase = () => {
  const createDB = async () => {
    const p = schemaBuilder.connect().then(async db => {
      const schema = db.getSchema();
      const promiseList = [];

      for (let i = 0; i < data.length; i++) {
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

            const blockingPromises = Object.keys(row).map(async k => {
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
        console.info('Loaded ' + rows.length + ' into ' + key);
      }
      await Promise.all(promiseList);
      return db;
    });

    return await p;
  };
  return createDB();
};

export default createDatabase;