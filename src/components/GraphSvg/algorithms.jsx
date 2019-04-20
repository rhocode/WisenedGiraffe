export const strongly_connected_components = function (graph) {
    console.error(graph);
    throw new Error('JKNFDKJNFDJN');
    const index_counter = ['0'];
    const stack = [];
    const lowlink = {};
    const index = {};
    const result = [];

    const _strong_connect = function (node) {
        index[node] = index_counter[0];
        lowlink[node] = index_counter[0];
        index_counter[0] = (parseInt(index_counter[0]) + 1).toString();
        stack.push(node);

        const successors = graph[node] || [];
        successors.forEach(successor => {
            if (!Object.keys(index).includes(successor)) {
                _strong_connect(successor);
                if (lowlink[node] === undefined || lowlink[successor] === undefined) {
                    throw new Error('Not defined: ' + node + ' ' + successor + ' ' + JSON.stringify(lowlink));
                }
                lowlink[node] = Math.min(parseInt(lowlink[node]), parseInt(lowlink[successor])).toString();
            } else if (stack.includes(successor)) {
                if (lowlink[node] === undefined || lowlink[successor] === undefined) {
                    throw new Error('Not defined: ' + node + ' ' + successor + ' ' + JSON.stringify(lowlink) + ' ' + JSON.stringify(index));
                }
                lowlink[node] = Math.min(parseInt(lowlink[node]), parseInt(index[successor])).toString();
            }
        });

        if (lowlink[node] === index[node]) {
            const connected_component = [];
            /*eslint no-constant-condition: ["error", { "checkLoops": false }]*/
            while (true) {
                const successor = stack.pop();
                connected_component.push(successor);
                if (successor === node) break;
            }
            result.push(connected_component.slice());
        }
    };
    Object.keys(graph).forEach(node => {
        if (!Object.keys(index).includes(node)) {
            _strong_connect(node);
        }
    });

    return result;
};

const remove_node = function (G, target) {
    delete G[target];
    const values = Object.keys(G).map(key => G[key]);
    values.forEach(value => {
        value.delete(target);
    });
};

const subgraphs = function (G, vertices) {
    const returnMap = {};
    vertices.forEach(v => {
        const gvarray = Array.from(G[v]);
        const filtered = gvarray.filter(elem => vertices.has(elem));


        returnMap[v] = new Set(filtered);
    });
    return returnMap;
};

export const strongly_connected_components_standalone = function (graph) {
    const index_counter = ['0'];
    const stack = [];
    const lowlink = {};
    const index = {};
    const result = [];

    const _strong_connect = function (node) {
        index[node] = index_counter[0];
        lowlink[node] = index_counter[0];
        index_counter[0] = (parseInt(index_counter[0], 10) + 1).toString();
        stack.push(node);

        const successors = graph[node] || [];
        successors.forEach(successor => {
            if (!Object.keys(index).includes(successor)) {
                _strong_connect(successor);
                if (lowlink[node] === undefined || lowlink[successor] === undefined) {
                    throw new Error('Not defined: ' + node + ' ' + successor + ' ' + JSON.stringify(lowlink));
                }
                lowlink[node] = Math.min(parseInt(lowlink[node], 10), parseInt(lowlink[successor], 10)).toString();
            } else if (stack.includes(successor)) {
                if (lowlink[node] === undefined || lowlink[successor] === undefined) {
                    throw new Error('Not defined: ' + node + ' ' + successor + ' ' + JSON.stringify(lowlink) + ' ' + JSON.stringify(index));
                }
                lowlink[node] = Math.min(parseInt(lowlink[node], 10), parseInt(index[successor], 10)).toString();
            }
        });

        if (lowlink[node] === index[node]) {
            const connected_component = [];
            /*eslint no-constant-condition: ["error", { "checkLoops": false }]*/
            while (true) {
                const successor = stack.pop();
                connected_component.push(successor);
                if (successor === node) break;
            }
            result.push(connected_component.slice());
        }
    };
    Object.keys(graph).forEach(node => {
        if (!Object.keys(index).includes(node)) {
            _strong_connect(node);
        }
    });

    return result;
};

export const simple_cycle = function (Ginput) {
    const _unblock = function (thisnode, blocked, B) {
        const stack = new Set([thisnode]);
        while (stack.size) {
            const node = stack.values().next().value;
            stack.delete(node);
            if (blocked.has(node)) {
                blocked.delete(node);
                if (!B[node]) {
                    B[node] = new Set();
                }
                B[node].forEach(elem => {
                    stack.add(elem);
                });
                B[node].clear();
            }
        }
    };


    const G = {};
    Object.keys(Ginput).forEach(key => {
        G[key] = new Set(Ginput[key].map(elem => elem.toString()));
    });

    const sccs = strongly_connected_components(G);
    const returnValues = [];
    while (sccs.length) {
        const scc = sccs.pop();
        const startnode = scc.pop();
        const path = [startnode];
        const blocked = new Set();
        const closed = new Set();
        blocked.add(startnode);
        const B = {};
        const stack = [[startnode, Array.from(G[startnode] || new Set())]];
        while (stack.length) {
            const [thisnode, nbrs] = stack[stack.length - 1];
            if (nbrs && nbrs.length) {
                const nextnode = nbrs.pop();
                if (nextnode === startnode) {
                    returnValues.push(path.slice().map(elem => parseInt(elem)));
                    path.forEach(node => {
                        closed.add(node);
                    });
                } else if (!blocked.has(nextnode)) {
                    path.push(nextnode);
                    stack.push([nextnode, Array.from(G[nextnode] || new Set())]);
                    closed.delete(nextnode);
                    blocked.add(nextnode);
                }
            } else {
                if (closed.has(thisnode)) {
                    _unblock(thisnode, blocked, B);
                } else {
                    (G[thisnode] || []).forEach(nbr => {
                        B[nbr] = B[nbr] || new Set();
                        if (!B[nbr].has(nbr)) {
                            B[nbr].add(thisnode);
                        }
                    });
                }

                stack.pop();
                path.pop();
            }
        }

        remove_node(G, startnode);
        const H = subgraphs(G, new Set(scc));
        const toAdd = strongly_connected_components(H);
        toAdd.forEach(elem => {
            sccs.push(elem);
        });
    }
    return returnValues;
};

// how to remove dups

//to generate the specific indexes
// pos = myArray.map(function(e) { return e.hello; }).indexOf('stevie');


// var a = [1, 2, 3], b = [101, 2, 1, 10];
// var c = a.concat(b);
// var d = c.filter(function (item, pos) {return c.indexOf(item) == pos});