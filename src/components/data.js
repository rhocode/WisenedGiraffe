const s = {};

s.NODES = {
  MACHINE_NODE: 'MACHINE_NODE',
  RESOURCE_NODE: 'RESOURCE_NODE'
};

s.MACHINE_NODE_TYPES = {
  MINER: 'MINER_NODE',
  SMELTER: 'SMELTER_NODE',
  ASSEMBLER: 'ASSEMBLER_NODE',
  MANUFACTURER: 'MANUFACTURER_NODE',
  GOAL_GENERATOR: 'COAL_GENERATOR_NODE',
  CONSTRUCTOR: 'CONSTRUCTOR_NODE'
};

const machine_type_nodes = s.NODES.MACHINE_NODE;
const bUrl = 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/';

s.MACHINE_VERSIONS = {
  MARK_ONE: 'MARK_ONE',
  MARK_TWO: 'MARK_TWO',
};

s.MACHINES = {
  // Constructors
  [s.MACHINE_NODE_TYPES.CONSTRUCTOR]: {
    node_type: machine_type_nodes,
    types: {
      [s.MACHINE_VERSIONS.MARK_ONE]: {
        name: 'Constructor Mk.1',
        icon: bUrl + 'Constructor.png'
      },
      [s.MACHINE_VERSIONS.MARK_TWO]: {
        name: 'Constructor Mk.2',
        icon: bUrl + 'Constructor.png'
      }
    }
  },

  // Miners
  [s.MACHINE_NODE_TYPES.MINER]: {
    node_type: machine_type_nodes,
    types: {
      [s.MACHINE_VERSIONS.MARK_ONE]: {
        name: 'Miner Mk.1',
        icon: bUrl + 'Miner_MK1.png'
      },
      [s.MACHINE_VERSIONS.MARK_TWO]: {
        name: 'Miner Mk.2',
        icon: bUrl + 'Miner_MK1.png'
      }
    }
  },
  //Smelters
  [s.MACHINE_NODE_TYPES.SMELTER]: {
    node_type: machine_type_nodes,
    types: {
      [s.MACHINE_VERSIONS.MARK_ONE]: {
        name: 'Smelter Mk.1',
        icon: bUrl + 'Smelter.png'
      },
      [s.MACHINE_VERSIONS.MARK_TWO]: {
        name: 'Smelter Mk.2',
        icon: bUrl + 'Smelter.png'
      }
    }
  },
  //Assemblers
  [s.MACHINE_NODE_TYPES.ASSEMBLER]: {
    node_type: machine_type_nodes,
    types: {
      [s.MACHINE_VERSIONS.MARK_ONE]: {
        name: 'Assembler Mk.1',
        icon: bUrl + 'Assembler.png'
      },
      [s.MACHINE_VERSIONS.MARK_TWO]: {
        name: 'Assembler Mk.2',
        icon: bUrl + 'Assembler.png'
      }
    }
  },
  //Assemblers
  [s.MACHINE_NODE_TYPES.MANUFACTURER]: {
    node_type: machine_type_nodes,
    types: {
      [s.MACHINE_VERSIONS.MARK_ONE]: {
        name: 'Manufacturer Mk.1',
        icon: null
      },
      [s.MACHINE_VERSIONS.MARK_TWO]: {
        name: 'Manufacturer Mk.2',
        icon: null
      }
    }
  },
  //Coal Generator
  [s.MACHINE_NODE_TYPES.COAL_GENERATOR_NODE]: {
    node_type: machine_type_nodes,
    types: {
      [s.MACHINE_VERSIONS.MARK_ONE]: {
        name: 'Coal Generator',
        icon: bUrl + 'Coal_Generator.png'
      }
    }
  },
};

s.PATHS = {
  ITEM_PATH: 'ITEM_PATH'
};

s.GRAPH_TYPES = {
  NODES: s.NODES,
  PATHS: s.PATHS
};

s.PURITY_TYPES = {
  IMPURE: 'IMPURE_NODE',
  NORMAL: 'NORMAL',
  PURE: 'PURE',
  get get() {
    return {
      get [s.PURITY_TYPES.IMPURE]() {
        return {name: 'Impure'};
      },
      get [s.PURITY_TYPES.NORMAL]() {
        return {name: 'Normal'};
      },
      get [s.PURITY_TYPES.PURE]() {
        return {name: 'Pure'};
      }
    };
  }
};

s.RESOURCES_TYPES = {};

const resource_type_node = s.NODES.RESOURCE_NODE;

s.RESOURCES = {
  IRON: 'IRON',
  COAL: 'COAL',
  COPPER: 'COPPER',
  LIMESTONE: 'LIMESTONE',
  get get() {
    return {
      get [s.RESOURCES.IRON]() {
        return {
          node_type: resource_type_node,
          name: 'Iron Ore',
          types: {
            [s.PURITY_TYPES.IMPURE]: {
              name: 'Impure Iron',
              icon: bUrl + 'Iron_Ore.png'
            },
            [s.PURITY_TYPES.NORMAL]: {
              name: 'Normal Iron',
              icon: bUrl + 'Iron_Ore.png'
            },
            [s.PURITY_TYPES.PURE]: {
              name: 'Pure Iron',
              icon: bUrl + 'Iron_Ore.png'
            }
          }
        };
      },
      get [s.RESOURCES.COAL]() {
        return {
          node_type: resource_type_node,
          name: 'Coal Ore',
          types: {
            [s.PURITY_TYPES.IMPURE]: {
              name: 'Impure Coal',
              icon: bUrl + 'Coal.png'
            },
            [s.PURITY_TYPES.NORMAL]: {
              name: 'Normal Coal',
              icon: bUrl + 'Coal.png'
            },
            [s.PURITY_TYPES.PURE]: {
              name: 'Pure Coal',
              icon: bUrl + 'Coal.png'
            }
          }
        };
      },
      get [s.RESOURCES.COPPER]() {
        return {
          node_type: resource_type_node,
          name: 'Copper Ore',
          types: {
            [s.PURITY_TYPES.IMPURE]: {
              name: 'Impure Copper',
              icon: bUrl + 'Copper_Ore.png'
            },
            [s.PURITY_TYPES.NORMAL]: {
              name: 'Normal Copper',
              icon: bUrl + 'Copper_Ore.png'
            },
            [s.PURITY_TYPES.PURE]: {
              name: 'Pure Copper',
              icon: bUrl + 'Copper_Ore.png'
            }
          }
        };
      },
      get [s.RESOURCES.LIMESTONE]() {
        return {
          node_type: resource_type_node,
          name: 'Limestone Ore',
          types: {
            [s.PURITY_TYPES.IMPURE]: {
              name: 'Impure Limestone',
              icon: bUrl + 'Limestone.png'
            },
            [s.PURITY_TYPES.NORMAL]: {
              name: 'Normal Limestone',
              icon: bUrl + 'Limestone.png'
            },
            [s.PURITY_TYPES.PURE]: {
              name: 'Pure Limestone',
              icon: bUrl + 'Limestone.png'
            }
          }
        };
      }
    };
  }
};

s.ITEMS = {
  IRON_INGOT: 'IRON_INGOT',
  IRON_PLATE: 'IRON_PLATE',
  IRON_ROD: 'IRON_ROD',
  SCREW: 'SCREW',
  COPPER_INGOT: 'COPPER_INGOT',
  WIRE: 'WIRE',
  CABLE: 'CABLE',
  CONCRETE: 'CONCRETE',
  REINFORCED_IRON_PLATE: 'REINFORCED_IRON_PLATE',
  MODULAR_FRAME: 'MODULAR_FRAME',
  ROTOR: 'ROTOR',
  get get() {
    return {
      get [s.ITEMS.IRON_INGOT]() {
        return {
          name: 'Iron Ingot',
          crafting: [
            {
              get in() {
                return [
                  {resource: s.RESOURCES.IRON, quantity: 1, raw: true}
                ];
              },
              machine: s.MACHINE_NODE_TYPES.SMELTER,
              output_quantity: 1,
              time: 2,
              power: 4
            }
          ],
          icon: bUrl + 'Iron_Ingot.png'
        };
      },
      get [s.ITEMS.IRON_PLATE]() {
        return {
          name: 'Iron Plate',
          crafting: [
            {
              get in() {
                return [
                  {resource: s.ITEMS.IRON_INGOT, quantity: 2}
                ];
              },
              machine: s.MACHINE_NODE_TYPES.CONSTRUCTOR,
              output_quantity: 1,
              time: 4,
              power: 4
            }
          ],
          icon: bUrl + 'Iron_Plate.png'
        };
      },
      get [s.ITEMS.IRON_ROD]() {
        return {
          name: 'Iron Rod',
          crafting: [
            {
              get in() {
                return [
                  {resource: s.ITEMS.IRON_INGOT, quantity: 1}
                ];
              },
              machine: s.MACHINE_NODE_TYPES.CONSTRUCTOR,
              output_quantity: 1,
              time: 4,
              power: 4
            }
          ],
          icon: bUrl + 'Iron_Rod.png'
        };
      },
      get [s.ITEMS.SCREW]() {
        return {
          name: 'Screw',
          crafting: [
            {
              get in() {
                return [
                  {resource: s.ITEMS.IRON_ROD, quantity: 1}
                ];
              },
              machine: s.MACHINE_NODE_TYPES.CONSTRUCTOR,
              output_quantity: 6,
              time: 4,
              power: 4
            }
          ],
          icon: bUrl + 'Screw.png'
        };
      },
      get [s.ITEMS.COPPER_INGOT]() {
        return {
          name: 'Copper Ingot',
          crafting: [
            {
              get in() {
                return [
                  {resource: s.RESOURCES.COPPER, quantity: 1, raw: true}
                ];
              },
              machine: s.MACHINE_NODE_TYPES.SMELTER,
              output_quantity: 3,
              time: 2,
              power: 4
            }
          ],
          icon: bUrl + 'Copper_Ingot.png'
        };
      },
      get [s.ITEMS.WIRE]() {
        return {
          name: 'Wire',
          crafting: [
            {
              get in() {
                return [
                  {resource: s.ITEMS.COPPER_INGOT, quantity: 2}
                ];
              },
              machine: s.MACHINE_NODE_TYPES.CONSTRUCTOR,
              output_quantity: 3,
              time: 4,
              power: 4
            }
          ],
          icon: bUrl + 'Wire.png'
        };
      },
      get [s.ITEMS.CABLE]() {
        return {
          name: 'Cable',
          crafting: [
            {
              get in() {
                return [
                  {resource: s.ITEMS.WIRE, quantity: 2}
                ];
              },
              machine: s.MACHINE_NODE_TYPES.CONSTRUCTOR,
              output_quantity: 1,
              time: 4,
              power: 4
            }
          ],
          icon: bUrl + 'Cable.png'
        };
      },
      get [s.ITEMS.CONCRETE]() {
        return {
          name: 'Modular Frame',
          crafting: [
            {
              get in() {
                return [
                  // Handle Special Case with Limestone...
                  {resource: s.RESOURCES.LIMESTONE, quantity: 3, isRaw: true}
                ];
              },
              machine: s.MACHINE_NODE_TYPES.CONSTRUCTOR,
              output_quantity: 1,
              time: 4,
              power: 4
            }
          ],
          icon: bUrl + 'Modular_Frame.png'
        };
      },
      get [s.ITEMS.REINFORCED_IRON_PLATE]() {
        return {
          name: 'Reinforced Iron Plate',
          crafting: [
            {
              get in() {
                return [
                  {resource: s.ITEMS.IRON_PLATE, quantity: 4},
                  {resource: s.ITEMS.SCREW, quantity: 24}
                ];
              },
              machine: s.MACHINE_NODE_TYPES.ASSEMBLER,
              output_quantity: 1,
              time: 12,
              power: 15
            },
            {
              get restricted() {
                return !s.PLAYER_UNLOCKS.RESEARCH_UNLOCKED_ALTERNATE_REINFORCED_IRON_PLATE;
              },
              get in() {
                return [
                  {resource: s.ITEMS.IRON_PLATE, quantity: 10},
                  {resource: s.ITEMS.SCREW, quantity: 24}
                ];
              },
              machine: s.MACHINE_NODE_TYPES.ASSEMBLER,
              output_quantity: 3,
              time: 24,
              power: 15
            }
          ],
          icon: bUrl + 'Reinforced_Iron_Plate.png'
        };
      },
      get [s.ITEMS.MODULAR_FRAME]() {
        return {
          name: 'Modular Frame',
          crafting: [
            {
              get in() {
                return [
                  {resource: s.ITEMS.REINFORCED_IRON_PLATE, quantity: 3},
                  {resource: s.ITEMS.IRON_ROD, quantity: 6}
                ];
              },
              machine: s.MACHINE_NODE_TYPES.ASSEMBLER,
              output_quantity: 1,
              time: 15,
              power: 15
            }
          ],
          icon: bUrl + 'Modular_Frame.png'
        };
      },
      get [s.ITEMS.ROTOR]() {
        return {
          name: 'Rotor',
          crafting: [
            {
              get in() {
                return [
                  {resource: s.ITEMS.IRON_ROD, quantity: 3},
                  {resource: s.ITEMS.SCREW, quantity: 22}
                ];
              },
              machine: s.MACHINE_NODE_TYPES.ASSEMBLER,
              output_quantity: 1,
              time: 10,
              power: 15
            }],
          icon: bUrl + 'Rotor.png'
        };
      },
    };
  }
};

s.PLAYER_UNLOCKS = {
  RESEARCH_UNLOCKED_ALTERNATE_REINFORCED_IRON_PLATE: true
};

export default s;