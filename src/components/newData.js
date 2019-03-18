const s = {};

const isObject = (obj) => obj && (typeof obj === 'object');
const isArray = (obj) => isObject(obj) && (obj instanceof Array);


function replacePrimitives(object, i) {
  let shouldUpdateMethod = false;
  if (['string', 'boolean', 'number'].includes(object[i])) {
    shouldUpdateMethod = true;
  }

  console.log(object[i]);
  if (typeof object[i] == 'string') {
    object[i] = new String(object[i]);
  } else if (typeof object[i] == 'boolean') {
    object[i] = new Boolean(object[i]);
  } else if (typeof object[i] == 'number') {
    object[i] = new Number(object[i]);
  }
  if (shouldUpdateMethod) {
    object[i].toString = () => object[i].valueOf();
  }
  setParent(object[i], object);
}

const setParent = (object, parent) => {
  Object.defineProperty(object, 'getParent', {
    enumerable: false,
    writable: true
  });

  object.getParent = () => {
    return parent;
  };
  if (object.getData) {
    console.log(object);
    console.log(object.getData());
  }

  if (isArray(object)) {
    for (var i = 0; i < object.length; i++) {
      replacePrimitives(object, i);
    }
  } else if (isObject(object)) {
    if (object instanceof String || object instanceof Boolean || object instanceof Number) {
      return;
    }
    Object.keys(object).map((i => {
      replacePrimitives(object, i);
    }));
  }
};

// const machine_type_nodes = s.NODES.MACHINE_NODE;
const bUrl = 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/';

const dataGenerator = {
  nodes: [
    {key: 'MACHINE_NODE', value: new String('MACHINE_NODE')},
    {key: 'RESOURCE_NODE', value: new String('RESOURCE_NODE')},
  ],
  machine_versions: [
    {key: 'MARK_ONE', value: 'MARK_ONE', data: null},
    {key: 'MARK_TWO', value: 'MARK_TWO', data: null},
  ],
  machine_node_types: [
    {key: 'MINER', value: 'MINER', data: {name: 'Miner', plural: 'Miners', definition: {
      get node_type() { return s.NODES.MACHINE_NODE; },
      get types() {
        return {
          [s.MACHINE_VERSIONS.MARK_ONE]: {
            name: 'Miner Mk.1',
            icon: bUrl + 'Miner_MK1.png'
          },
          [s.MACHINE_VERSIONS.MARK_TWO]: {
            name: 'Miner Mk.2',
            icon: bUrl + 'Miner_MK1.png',
            hidden: true
          }
        };
      },
      'meme':  '1'
    }}},
    {key: 'SMELTER', value: 'SMELTER', data: {name: 'Smelter', plural: 'Smelters'}},
    {key: 'ASSEMBLER', value: 'ASSEMBLER', data: {name: 'Assembler', plural: 'Assemblers'}},
    {key: 'MANUFACTURER', value: 'MANUFACTURER', data: {name: 'Manufacturer', plural: 'Manufacturers'}},
    {key: 'COAL_GENERATOR', value: 'COAL_GENERATOR', data: {name: 'Coal Generator', plural: 'Coal Generators'}},
    {key: 'CONSTRUCTOR', value: 'CONSTRUCTOR', data: {name: 'Constructor', plural: 'Constructor'}},
  ],
  // machines: [
  //   {get key(){return }, value: 'MINER', data: {name: 'Miner', plural: 'Miners'}},
  //   {key: 'SMELTER', value: 'SMELTER', data: {name: 'Smelter', plural: 'Smelters'}},
  // ]
};

Object.keys(dataGenerator).map((key) => {
  const key_upper = key.toUpperCase();
  s[key_upper] = {};
  const struct = s[key_upper];
  dataGenerator[key].map((element) => {
    if (!isObject(element.value)) {
      if (typeof element.value == 'string') {
        struct[element.key] = new String(element.value);
        struct[element.key].toString = () => struct[element.key].valueOf();
      } else {
        console.log('Something different?', element.value);
      }
    } else {
      struct[element.key] = element.value;
    }

    Object.defineProperty(struct[element.key], 'getData', {
      enumerable: false,
      writable: true
    });

    struct[element.key].getData = () => element.data;
  });
});

// setParent(s);
console.log(s);

// const machine_type_nodes = s.NODES.MACHINE_NODE;
// const bUrl = 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/';
//
// s.MACHINE_VERSIONS = {
//   MARK_ONE: 'MARK_ONE',
//   MARK_TWO: 'MARK_TWO',
// };
//
// s.MACHINES = {
//   // Constructors
//   [s.MACHINE_NODE_TYPES.CONSTRUCTOR]: {
//     node_type: machine_type_nodes,
//     types: {
//       [s.MACHINE_VERSIONS.MARK_ONE]: {
//         name: 'Constructor Mk.1',
//         icon: bUrl + 'Constructor.png'
//       },
//       [s.MACHINE_VERSIONS.MARK_TWO]: {
//         name: 'Constructor Mk.2',
//         icon: bUrl + 'Constructor.png',
//         hidden: 1
//       }
//     }
//   },
//
//   // Miners
//   [s.MACHINE_NODE_TYPES.MINER]: {
//     node_type: machine_type_nodes,
//     types: {
//       [s.MACHINE_VERSIONS.MARK_ONE]: {
//         name: 'Miner Mk.1',
//         icon: bUrl + 'Miner_MK1.png'
//       },
//       [s.MACHINE_VERSIONS.MARK_TWO]: {
//         name: 'Miner Mk.2',
//         icon: bUrl + 'Miner_MK1.png',
//         hidden: true
//       }
//     }
//   },
//   //Smelters
//   [s.MACHINE_NODE_TYPES.SMELTER]: {
//     node_type: machine_type_nodes,
//     types: {
//       [s.MACHINE_VERSIONS.MARK_ONE]: {
//         name: 'Smelter Mk.1',
//         icon: bUrl + 'Smelter.png'
//       },
//       [s.MACHINE_VERSIONS.MARK_TWO]: {
//         name: 'Smelter Mk.2',
//         icon: bUrl + 'Smelter.png',
//         hidden: true
//
//       }
//     }
//   },
//   //Assemblers
//   [s.MACHINE_NODE_TYPES.ASSEMBLER]: {
//     node_type: machine_type_nodes,
//     types: {
//       [s.MACHINE_VERSIONS.MARK_ONE]: {
//         name: 'Assembler Mk.1',
//         icon: bUrl + 'Assembler.png'
//       },
//       [s.MACHINE_VERSIONS.MARK_TWO]: {
//         name: 'Assembler Mk.2',
//         icon: bUrl + 'Assembler.png',
//         hidden: true
//       }
//     }
//   },
//   //Assemblers
//   [s.MACHINE_NODE_TYPES.MANUFACTURER]: {
//     hidden: true,
//     node_type: machine_type_nodes,
//     types: {
//       [s.MACHINE_VERSIONS.MARK_ONE]: {
//         name: 'Manufacturer Mk.1',
//         icon: null
//       },
//       [s.MACHINE_VERSIONS.MARK_TWO]: {
//         name: 'Manufacturer Mk.2',
//         icon: null,
//       }
//     }
//   },
//   //Coal Generator
//   [s.MACHINE_NODE_TYPES.GOAL_GENERATOR]: {
//     hidden: true,
//     node_type: machine_type_nodes,
//     types: {
//       [s.MACHINE_VERSIONS.MARK_ONE]: {
//         name: 'Coal Generator',
//         icon: bUrl + 'Coal_Generator.png'
//       }
//     }
//   },
// };
//
// s.PATHS = {
//   ITEM_PATH: 'ITEM_PATH'
// };
//
// s.GRAPH_TYPES = {
//   NODES: s.NODES,
//   PATHS: s.PATHS
// };
//
// s.PURITY_TYPES = {
//   IMPURE: 'IMPURE',
//   NORMAL: 'NORMAL',
//   PURE: 'PURE',
//   get get() {
//     return {
//       get [s.PURITY_TYPES.IMPURE]() {
//         return {name: 'Impure'};
//       },
//       get [s.PURITY_TYPES.NORMAL]() {
//         return {name: 'Normal'};
//       },
//       get [s.PURITY_TYPES.PURE]() {
//         return {name: 'Pure'};
//       }
//     };
//   }
// };
//
// s.RESOURCES_TYPES = {};
//
// const resource_type_node = s.NODES.RESOURCE_NODE;
//
// s.RESOURCES = {
//   IRON: 'IRON',
//   COAL: 'COAL',
//   COPPER: 'COPPER',
//   LIMESTONE: 'LIMESTONE',
//   get get() {
//     return {
//       get [s.RESOURCES.IRON]() {
//         return {
//           node_type: resource_type_node,
//           produces: s.ITEMS.IRON_ORE,
//           name: 'Iron Ore',
//           types: {
//             [s.PURITY_TYPES.IMPURE]: {
//               name: 'Impure Iron',
//               icon: bUrl + 'Iron_Ore.png'
//             },
//             [s.PURITY_TYPES.NORMAL]: {
//               name: 'Normal Iron',
//               icon: bUrl + 'Iron_Ore.png'
//             },
//             [s.PURITY_TYPES.PURE]: {
//               name: 'Pure Iron',
//               icon: bUrl + 'Iron_Ore.png'
//             }
//           }
//         };
//       },
//       get [s.RESOURCES.COAL]() {
//         return {
//           node_type: resource_type_node,
//           name: 'Coal Ore',
//           produces: s.ITEMS.COAL_ORE,
//           hidden: true,
//           types: {
//             [s.PURITY_TYPES.IMPURE]: {
//               name: 'Impure Coal',
//               icon: bUrl + 'Coal.png'
//             },
//             [s.PURITY_TYPES.NORMAL]: {
//               name: 'Normal Coal',
//               icon: bUrl + 'Coal.png'
//             },
//             [s.PURITY_TYPES.PURE]: {
//               name: 'Pure Coal',
//               icon: bUrl + 'Coal.png'
//             }
//           }
//         };
//       },
//       get [s.RESOURCES.COPPER]() {
//         return {
//           node_type: resource_type_node,
//           name: 'Copper Ore',
//           produces: s.ITEMS.COPPER_ORE,
//           types: {
//             [s.PURITY_TYPES.IMPURE]: {
//               name: 'Impure Copper',
//               icon: bUrl + 'Copper_Ore.png'
//             },
//             [s.PURITY_TYPES.NORMAL]: {
//               name: 'Normal Copper',
//               icon: bUrl + 'Copper_Ore.png'
//             },
//             [s.PURITY_TYPES.PURE]: {
//               name: 'Pure Copper',
//               icon: bUrl + 'Copper_Ore.png'
//             }
//           }
//         };
//       },
//       get [s.RESOURCES.LIMESTONE]() {
//         return {
//           node_type: resource_type_node,
//           produces: s.ITEMS.LIMESTONE,
//           name: 'Limestone Ore',
//           hidden: true,
//           types: {
//             [s.PURITY_TYPES.IMPURE]: {
//               name: 'Impure Limestone',
//               icon: bUrl + 'Limestone.png'
//             },
//             [s.PURITY_TYPES.NORMAL]: {
//               name: 'Normal Limestone',
//               icon: bUrl + 'Limestone.png'
//             },
//             [s.PURITY_TYPES.PURE]: {
//               name: 'Pure Limestone',
//               icon: bUrl + 'Limestone.png'
//             }
//           }
//         };
//       }
//     };
//   }
// };
//
// s.ITEMS = {
//   IRON_ORE: 'IRON_ORE',
//   COPPER_ORE: 'COPPER_ORE',
//   IRON_INGOT: 'IRON_INGOT',
//   IRON_PLATE: 'IRON_PLATE',
//   IRON_ROD: 'IRON_ROD',
//   SCREW: 'SCREW',
//   COPPER_INGOT: 'COPPER_INGOT',
//   WIRE: 'WIRE',
//   CABLE: 'CABLE',
//   CONCRETE: 'CONCRETE',
//   REINFORCED_IRON_PLATE: 'REINFORCED_IRON_PLATE',
//   MODULAR_FRAME: 'MODULAR_FRAME',
//   ROTOR: 'ROTOR',
//   get get() {
//     return {
//       get [s.ITEMS.COPPER_ORE]() {
//         return {
//           name: 'Copper Ore',
//           crafting: [
//             {
//               get in() {
//                 return [
//                   {resource: s.RESOURCES.COPPER, quantity: 1, raw: true, purity: s.PURITY_TYPES.IMPURE}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.MINER,
//               output_quantity: 1,
//               time: 2,
//               power: 5
//             },
//             {
//               get in() {
//                 return [
//                   {resource: s.RESOURCES.COPPER, quantity: 1, raw: true, purity: s.PURITY_TYPES.NORMAL}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.MINER,
//               output_quantity: 1,
//               time: 1,
//               power: 5
//             },
//             {
//               get in() {
//                 return [
//                   {resource: s.RESOURCES.COPPER, quantity: 1, raw: true, purity: s.PURITY_TYPES.PURE}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.MINER,
//               output_quantity: 1,
//               time: 0.5,
//               power: 5
//             }
//           ],
//           icon: bUrl + 'Copper_Ore.png'
//         };
//       },
//       get [s.ITEMS.IRON_ORE]() {
//         return {
//           name: 'Iron Ore',
//           crafting: [
//             {
//               get in() {
//                 return [
//                   {resource: s.RESOURCES.IRON, quantity: 1, raw: true, purity: s.PURITY_TYPES.IMPURE}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.MINER,
//               output_quantity: 1,
//               time: 2,
//               power: 5
//             },
//             {
//               get in() {
//                 return [
//                   {resource: s.RESOURCES.IRON, quantity: 1, raw: true, purity: s.PURITY_TYPES.NORMAL}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.MINER,
//               output_quantity: 1,
//               time: 1,
//               power: 5
//             },
//             {
//               get in() {
//                 return [
//                   {resource: s.RESOURCES.IRON, quantity: 1, raw: true, purity: s.PURITY_TYPES.PURE}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.MINER,
//               output_quantity: 1,
//               time: 0.5,
//               power: 5
//             }
//           ],
//           icon: bUrl + 'Iron_Ore.png'
//         };
//       },
//       get [s.ITEMS.IRON_INGOT]() {
//         return {
//           name: 'Iron Ingot',
//           crafting: [
//             {
//               get in() {
//                 return [
//                   {resource: s.ITEMS.IRON_ORE, quantity: 1}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.SMELTER,
//               output_quantity: 1,
//               time: 2,
//               power: 4
//             }
//           ],
//           icon: bUrl + 'Iron_Ingot.png'
//         };
//       },
//       get [s.ITEMS.IRON_PLATE]() {
//         return {
//           name: 'Iron Plate',
//           crafting: [
//             {
//               get in() {
//                 return [
//                   {resource: s.ITEMS.IRON_INGOT, quantity: 2}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.CONSTRUCTOR,
//               output_quantity: 1,
//               time: 4,
//               power: 4
//             }
//           ],
//           icon: bUrl + 'Iron_Plate.png'
//         };
//       },
//       get [s.ITEMS.IRON_ROD]() {
//         return {
//           name: 'Iron Rod',
//           crafting: [
//             {
//               get in() {
//                 return [
//                   {resource: s.ITEMS.IRON_INGOT, quantity: 1}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.CONSTRUCTOR,
//               output_quantity: 1,
//               time: 4,
//               power: 4
//             }
//           ],
//           icon: bUrl + 'Iron_Rod.png'
//         };
//       },
//       get [s.ITEMS.SCREW]() {
//         return {
//           name: 'Screw',
//           crafting: [
//             {
//               get in() {
//                 return [
//                   {resource: s.ITEMS.IRON_ROD, quantity: 1}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.CONSTRUCTOR,
//               output_quantity: 6,
//               time: 4,
//               power: 4
//             }
//           ],
//           icon: bUrl + 'Screw.png'
//         };
//       },
//       get [s.ITEMS.COPPER_INGOT]() {
//         return {
//           name: 'Copper Ingot',
//           crafting: [
//             {
//               get in() {
//                 return [
//                   {resource: s.ITEMS.COPPER_ORE, quantity: 1}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.SMELTER,
//               output_quantity: 3,
//               time: 2,
//               power: 4
//             }
//           ],
//           icon: bUrl + 'Copper_Ingot.png'
//         };
//       },
//       get [s.ITEMS.WIRE]() {
//         return {
//           name: 'Wire',
//           crafting: [
//             {
//               get in() {
//                 return [
//                   {resource: s.ITEMS.COPPER_INGOT, quantity: 2}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.CONSTRUCTOR,
//               output_quantity: 3,
//               time: 4,
//               power: 4
//             }
//           ],
//           icon: bUrl + 'Wire.png'
//         };
//       },
//       get [s.ITEMS.CABLE]() {
//         return {
//           name: 'Cable',
//           crafting: [
//             {
//               get in() {
//                 return [
//                   {resource: s.ITEMS.WIRE, quantity: 2}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.CONSTRUCTOR,
//               output_quantity: 1,
//               time: 4,
//               power: 4
//             }
//           ],
//           icon: bUrl + 'Cable.png'
//         };
//       },
//       get [s.ITEMS.CONCRETE]() {
//         return {
//           name: 'Concrete',
//           hidden: true,
//           crafting: [
//             {
//               get in() {
//                 return [
//                   // Handle Special Case with Limestone...
//                   {resource: s.RESOURCES.LIMESTONE, quantity: 3, isRaw: true}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.CONSTRUCTOR,
//               output_quantity: 1,
//               time: 4,
//               power: 4,
//               hidden: true,
//             }
//           ],
//           icon: bUrl + 'Concrete.png'
//         };
//       },
//       get [s.ITEMS.REINFORCED_IRON_PLATE]() {
//         return {
//           name: 'Reinforced Iron Plate',
//           crafting: [
//             {
//               get in() {
//                 return [
//                   {resource: s.ITEMS.IRON_PLATE, quantity: 4},
//                   {resource: s.ITEMS.SCREW, quantity: 24}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.ASSEMBLER,
//               output_quantity: 1,
//               time: 12,
//               power: 15
//             },
//             // { // Unhide once we have better handling
//             //   get restricted() {
//             //     return !s.PLAYER_UNLOCKS.RESEARCH_UNLOCKED_ALTERNATE_REINFORCED_IRON_PLATE;
//             //   },
//             //   get in() {
//             //     return [
//             //       {resource: s.ITEMS.IRON_PLATE, quantity: 10},
//             //       {resource: s.ITEMS.SCREW, quantity: 24}
//             //     ];
//             //   },
//             //   machine: s.MACHINE_NODE_TYPES.ASSEMBLER,
//             //   output_quantity: 3,
//             //   time: 24,
//             //   power: 15
//             // }
//           ],
//           icon: bUrl + 'Reinforced_Iron_Plate.png'
//         };
//       },
//       get [s.ITEMS.MODULAR_FRAME]() {
//         return {
//           name: 'Modular Frame',
//           crafting: [
//             {
//               get in() {
//                 return [
//                   {resource: s.ITEMS.REINFORCED_IRON_PLATE, quantity: 3},
//                   {resource: s.ITEMS.IRON_ROD, quantity: 6}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.ASSEMBLER,
//               output_quantity: 1,
//               time: 15,
//               power: 15
//             }
//           ],
//           icon: bUrl + 'Modular_Frame.png'
//         };
//       },
//       get [s.ITEMS.ROTOR]() {
//         return {
//           name: 'Rotor',
//           crafting: [
//             {
//               get in() {
//                 return [
//                   {resource: s.ITEMS.IRON_ROD, quantity: 3},
//                   {resource: s.ITEMS.SCREW, quantity: 22}
//                 ];
//               },
//               machine: s.MACHINE_NODE_TYPES.ASSEMBLER,
//               output_quantity: 1,
//               time: 10,
//               power: 15
//             }],
//           icon: bUrl + 'Rotor.png'
//         };
//       },
//     };
//   }
// };
//
// s.PLAYER_UNLOCKS = {
//   RESEARCH_UNLOCKED_ALTERNATE_REINFORCED_IRON_PLATE: true
// };

export default s;