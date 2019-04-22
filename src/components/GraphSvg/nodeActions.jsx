import constants from './constants';
import {addPath, removePath} from './edgeActions';
import * as d3 from 'd3';
import {deselect_path_and_nodes} from './graphActions';
import {spliceUtil} from './util';

import {parseSvg} from 'd3-interpolate/src/transform/parse';

export const add_node = (d, t) => {

    const zoomData = parseSvg(d3.select('#svgGroup').attr('transform'));
    console.error(zoomData);

    var viewCenter = [];


    const bodyEl = document.getElementById('svgParent');
    console.log(bodyEl, "AAAAAA");
    const width = bodyEl.clientWidth;
    const height = bodyEl.clientHeight;

    viewCenter[0] = (0.5) * (width / zoomData.scaleX) - (zoomData.translateX / zoomData.scaleX);
    viewCenter[1] = (0.5) * (height / zoomData.scaleY) - (zoomData.translateY / zoomData.scaleY);

    d.id = d.id || t.id++;
    d.x = d.x || 0;
    d.y = d.y || 0;

    d.fx = viewCenter[0];
    d.fy = viewCenter[1];
    console.error(viewCenter);

    d.overclock = d.overclock || 100;
    t.graphData.nodes.push(d);
    t.updateGraphHelper();
};

export const delete_node = function (d, t) {
    // unselect currently selected node
    const selectedNode = t.state.selectedNode;
    remove_select_from_nodes(t);

    const toSplice = t.graphData.links.filter(function (l) {
        return l.source.id === selectedNode.id || l.target.id === selectedNode.id;
    });

    toSplice.map(function (l) {
        removePath(l, t);
    });
    spliceUtil(t.graphData.nodes, selectedNode);
};


export const node_clicked = function (d, t) {
    // unselect currently selected node
    const previouslySelected = t.state.selectedNode;
    remove_select_from_nodes(t);
    if (previouslySelected !== d) {
        deselect_path_and_nodes(t);
        t.setState({selectedNode: d});

        d3.select(this).classed(constants.graphNodeHoverClass, true)
            .classed(constants.graphNodeGrabbedClass, false)
            .classed(constants.selectedNodeClass, true);
    }
};

export const remove_select_from_nodes = function (graphSvg) {
    d3.select('.' + constants.selectedNodeClass)
        .classed(constants.selectedNodeClass, false)
        .classed(constants.graphNodeGrabbedClass, false);
    graphSvg.setState({selectedNode: null});
};


export const node_mouse_over = function (d, graphSvg) {

    graphSvg.setState({mouseOverNode: d3.select(this).datum()});
    d3.select(this).classed(constants.graphNodeHoverClass, true);
};

export const node_mouse_out = function (d, graphSvg) {
    graphSvg.setState({mouseOverNode: null});
    d3.select(this).classed(constants.graphNodeHoverClass, false);
};

export const node_mouse_down = function (d, graphSvg) {
    if (d3.event.shiftKey) {
        graphSvg.setState({shiftHeld: true, sourceId: d3.select(this).datum().id});
    } else {
        d3.select(this).classed(constants.graphNodeGrabbedClass, true);
    }
};

export const node_mouse_up = function (d, graphSvg) {
    // Only triggered if it's not a drag
    if (graphSvg.state && graphSvg.state.shiftHeld) {
    } else {
        //probably can't get to this case
    }
    graphSvg.setState({shiftHeld: false});
};


const overClockCalculation = (d, percentage_metric, offset, endOffsetRaw) => {
    const endOffset = endOffsetRaw + offset;
    const percentage = d[percentage_metric] * 100 || 0;
    const arc = d3.arc()
        .innerRadius(50)
        .outerRadius(50);

    const m = (endOffset - offset) / 100;
    const b = offset;

    const start = b / 180 * Math.PI;
    const end = (m * percentage + b) / 180 * Math.PI;
    return arc({startAngle: start, endAngle: end});
};


export const addEfficiencyArc = (parent, percentage_metric, offset, endOffset) => {
    parent.append('path').filter(function (d) {
        return !['Container', 'Logistic'].includes(d.machine.name)
    })
        .attr('class', constants.overclockedArcClass)
        .attr('fill', 'none')
        .attr('stroke-width', 8);

    editEfficiencyArc(percentage_metric, offset, endOffset);
};

export const editEfficiencyArc = (percentage_metric, offset, endOffset) => {
    d3.selectAll('.' + constants.overclockedArcClass)
        .attr('d', function (d) {
            return overClockCalculation(d, percentage_metric, offset, endOffset);
        })
        .attr('stroke', function (d) {

            function perc2color(perc) {
                var r, g, b = 0;
                if(perc < 50) {
                    r = 255;
                    g = Math.round(5.1 * perc);
                }
                else {
                    g = 255;
                    r = Math.round(510 - 5.10 * perc);
                }
                var h = r * 0x10000 + g * 0x100 + b * 0x1;
                return '#' + ('000000' + h.toString(16)).slice(-6);
            }

            const p =  100 * (d[percentage_metric] || 0);
            return perc2color(p)
        });
};

export const addNodeImage = (parent) => {
    parent.append('svg:image')
        .attr('class', function (d) {
            if (d.machine && d.machine.icon) {
                return 'machine-icon';
            }
            return 'dev-icon';
        })
        .attr('xlink:href', function (d) {
            if (d.instance && d.instance.icon) {
                return d.instance.icon;
            }
            if (d.machine && d.machine.icon) {
                return d.machine.icon;
            }
            return 'https://raw.githubusercontent.com/rhocode/rhocode.github.io/master/img/satoolsfactory_icons/Smelter.png';
        })
        .attr('x', function (d) {
            return -50;
        })
        .attr('y', function (d) {
            return -50;
        })
        .attr('height', 100)
        .attr('width', 100);
};

export const wheelZoomCalculation = function (d, overclockOverride = null, selectedElem = null) {
    if (overclockOverride === null) {
        d3.event.stopImmediatePropagation();
        let roughEstimate = -1;

        if (d3.event.deltaY < 0) {
            roughEstimate = 1;
        }

        d.overclock = (d.overclock + (roughEstimate));
        if (d.overclock < 0) {
            d.overclock = 251 + d.overclock;
        } else if (d.overclock > 250) {
            d.overclock = d.overclock - 251;
        }
        updateOverclock(d3.select(this).select('.' + constants.overclockedTextClass));
    } else {
        d.overclock = overclockOverride;
        updateOverclock(selectedElem);
    }


};

export const updateOverclock = function (textElement) {
    textElement.text(function (d) {
        return d.overclock;
    });
};

export const updateNodeTier = function (textElement) {
    textElement.text(function (d) {
        return d.instance.machine_version.representation;
        // + (d.id ? '(' + d.id + ')' : '' );
    });
};

export const updateComponents = function (elementsToUpdate) {
    const t = this;
    const itemAccessor = t.props.parentAccessor.state.recipe.item;
    elementsToUpdate.each(function (d) {
        const allowedInRemaining = d.allowedIn.slice();
        const provided = t.nodeIn[d.id] || [];
        const actualIn = provided.map(node => node.allowedOut).flat(1);

        actualIn.forEach(id => {
            spliceUtil(allowedInRemaining, id);
        });

        const element = d3.select(this);

        element.selectAll('.' + constants.nodeRequirementsSubIconClass).remove();

        if (allowedInRemaining.length > 0) {
            element.append('text').attr('class', 'fas fa-arrow-right')
                .classed(constants.nodeRequirementsSubIconClass, true)
                .attr('x', function (d) {
                    return -56 - 25;
                })
                .attr('y', function (d) {
                    return 3;
                })
                .attr('height', 25)
                .attr('width', 25);
            const fetchRemainingIn = allowedInRemaining.map(item =>
                itemAccessor.filter(findItem => item === findItem.id)[0]
            );

            const outputtedItems = new Set();

            let index = 0;
            fetchRemainingIn.forEach((remaining) => {
                if (outputtedItems.has(remaining.icon)) {
                    return;
                }
                outputtedItems.add(remaining.icon);
                element.append('svg:image')
                    .classed(constants.nodeRequirementsSubIconClass, true)
                    .on('mousedown', function (d) {
                        d3.event.stopImmediatePropagation();
                    })
                    .on('click', function (d) {
                        const findSuitableSource = t.graphData.nodes.filter(node => node.id !== d.id && node.open_out_slot > 0
                            && node.allowedOut.includes(remaining.id));
                        const thisNode = t.graphData.nodes.filter(node => node.id === d.id);
                        if (findSuitableSource.length > 0) {
                            addPath(t, findSuitableSource[0], thisNode[0]);
                        }
                        d3.event.stopImmediatePropagation();
                    })
                    .attr('xlink:href', function (d) {
                        return remaining.icon;
                    })
                    .attr('x', function (d) {
                        return -58 - 28 - 28 - (28 * index++);
                    })
                    .attr('y', function (d) {
                        return 3;
                    })
                    .attr('height', 25)
                    .attr('width', 25);
            });
        }
        const allowedOutRemaining = d.allowedOut.slice();
        const provides = t.nodeOut[d.id] || [];
        const actualOut = provides.map(node => node.allowedIn).flat(1);
        actualOut.forEach(id => {
            spliceUtil(allowedOutRemaining, id);
        });

        if (allowedOutRemaining.length > 0) {
            element.append('text').attr('class', 'fas fa-arrow-right')
                .classed(constants.nodeRequirementsSubIconClass, true)
                .attr('x', function (d) {
                    return 58;
                })
                .attr('y', function (d) {
                    return -28;
                })
                .attr('height', 25)
                .attr('width', 25);
            const fetchRemainingOut = allowedOutRemaining.map(item =>
                itemAccessor.filter(findItem => item === findItem.id)[0]
            );

            const outputtedItemsIn = new Set();

            let index = 0;
            fetchRemainingOut.forEach((remaining) => {
                if (outputtedItemsIn.has(remaining.icon)) {
                    return;
                }
                outputtedItemsIn.add(remaining.icon);
                element.append('svg:image')
                    .classed(constants.nodeRequirementsSubIconClass, true)
                    .on('mousedown', function (d) {
                        d3.event.stopImmediatePropagation();
                    })
                    .on('click', function (d) {
                        const findSuitableTarget = t.graphData.nodes.filter(node => node.id !== d.id && node.open_in_slots > 0
                            && node.allowedIn.includes(remaining.id));
                        const thisNode = t.graphData.nodes.filter(node => node.id === d.id);
                        if (findSuitableTarget.length > 0) {
                            addPath(t, thisNode[0], findSuitableTarget[0]);
                        }
                        d3.event.stopImmediatePropagation();
                    })
                    .attr('xlink:href', function (d) {
                        return remaining.icon;
                    })
                    .attr('x', function (d) {
                        return 85 + (28 * index++);
                    })
                    .attr('y', function (d) {
                        return -28;
                    })
                    .attr('height', 25)
                    .attr('width', 25);
            });
        }
    });
};

export const forceUpdateComponentLabel = function () {
    updateComponents.call(this, d3.selectAll('.' + constants.nodeRequirementsIconClass));
};


export const insertComponents = function (parentElement) {

    const el1 = parentElement.append('g').classed(constants.nodeRequirementsIconClass, true);

    el1.each(function (d) {
        if (d.machine && ['Container', 'Logistic'].includes(d.machine.name)) {
            // save this for later...
        } else {
            d3.select(this).append('svg:image')
                .classed(constants.nodeProducesClass, true)
                .attr('xlink:href', function (d) {
                    return d.data.recipe.item.icon;
                })
                .attr('x', function (d) {
                    return -55;
                })
                .attr('y', function (d) {
                    return 18;
                })
                .attr('height', 40)
                .attr('width', 40);
        }
    });

    d3.selectAll('.' + constants.nodeRequirementsIconClass).each(function (d) {
        if (d.machine && ['Container', 'Logistic'].includes(d.machine.name)) {
            const nodeThis = d3.select(this);
            nodeThis.selectAll('.' + constants.nodeProducesClass).remove();
            const outputtedItems = new Set();
            let i = 0;
            (d.containedItems || []).forEach((containedItem, index) => {
                if (outputtedItems.has(containedItem.icon)) {
                    return;
                }
                outputtedItems.add(containedItem.icon);
                nodeThis.append('svg:image')
                    .classed(constants.nodeProducesClass, true)
                    .attr('xlink:href', function (d) {
                        return d.containedItems[index].icon;
                    })
                    .attr('x', function (d) {
                        return -55;
                    })
                    .attr('y', function (d) {
                        return 18 + (30 * i++);
                    })
                    .attr('height', 40)
                    .attr('width', 40);
            });
        }
    });


    parentElement.append('g').classed(constants.nodeSurplusIconClass, true);

    d3.selectAll('.' + constants.nodeSurplusIconClass).each(function (d) {
        const nodeThis = d3.select(this);
        nodeThis.selectAll('.' + constants.nodeProducesPerMinText).remove();

        nodeThis.append('text')
            .attr('fill', 'white')
            .attr('class', 'overclockFont')
            .classed(constants.nodeProducesPerMinText, true)
            .style('text-anchor', 'end')
            .style('dominant-baseline', 'central')
            .attr('stroke', 'black')
            .attr('stroke-width', 4)
            .attr('x', -5).attr('y', -37)
            .attr('font-size', 30)
            .text(function (d) {
                let combinedSum = 0;
                Object.keys(d.itemsPerMinute || {}).forEach(item => {
                    combinedSum += d.itemsPerMinute[item];
                });

                return ((Math.round(combinedSum * 100) / 100) || 0) + '/m';
            });


        nodeThis.append('text').attr('fill', 'white')
            .attr('class', 'overclockFont')
            .classed(constants.nodeProducesPerMinText, true)
            .style('text-anchor', 'end')
            .style('dominant-baseline', 'central')
            .attr('x', -5).attr('y', -37)
            .attr('font-size', 30)
            .text(function (d) {
                let combinedSum = 0;
                Object.keys(d.itemsPerMinute || {}).forEach(item => {
                    combinedSum += d.itemsPerMinute[item];
                });

                return ((Math.round(combinedSum * 100) / 100) || 0) + '/m';
            });
    });

    const el3 = parentElement.append('g').classed(constants.nodeLimitingThroughputClass, true);


    d3.selectAll('.' + constants.nodeLimitingThroughputClass).each(function (d) {
        const nodeThis = d3.select(this);
        nodeThis.selectAll('.' + constants.nodeLimitingThroughputText).remove();

        Object.keys(d.itemThroughPut || {}).forEach((key, index) => {
            const item = d.itemThroughPut[key];

            if (!d.itemIconLookup) return;

            let definedColor = 'LightCoral';
            let nodeClass = 'node-has-problems';

            if (item.actual === item.max) {
                definedColor = 'white';
                nodeClass = null;
            } else if (item.actual < item.max) {
                definedColor = 'gold';
            }

            const icon = d.itemIconLookup[key];

            nodeThis.classed('node-has-problems', false);
            if (nodeClass) {
                nodeThis.classed('node-has-problems', true);
            }

            nodeThis.append('svg:image')
                .classed(constants.nodeLimitingThroughputText, true)
                .attr('xlink:href', function (d) {
                    return icon;
                })
                .attr('x', -49 + 35).attr('y', 59 + (index * 20))
                .attr('height', 20)
                .attr('width', 20);

            nodeThis.append('text')
                .attr('fill', 'black')
                .attr('class', 'overclockFont')
                .classed(constants.nodeLimitingThroughputText, true)
                .style('text-anchor', 'start')
                .style('dominant-baseline', 'central')
                .attr('stroke', 'black')
                .attr('stroke-width', 4)
                .attr('x', -25 + 35).attr('y', 68 + (index * 20))
                .attr('font-size', 20)
                .text(function (d) {
                    return Math.round(item.actual * 100) / 100 + '/' + Math.round(item.max * 100) / 100;
                });


            nodeThis.append('text').attr('fill', definedColor)
                .attr('class', 'overclockFont')
                .classed(constants.nodeLimitingThroughputText, true)
                .style('text-anchor', 'start')
                .style('dominant-baseline', 'central')
                .attr('x', -25 + 35).attr('y', 68 + (index * 20))
                .attr('font-size', 20)
                .text(function (d) {
                    return Math.round(item.actual * 100) / 100 + '/' + Math.round(item.max * 100) / 100;
                });

        });

    });

    forceUpdateComponentLabel.call(this);
};

export const updateNodeTierExternal = function (el, x = 35, y = 35) {
    el.selectAll('.' + constants.nodeVersionTextClass).remove();

    const backgroundText = el.append('text')
        .attr('fill', 'white')
        .attr('class', 'overclockFont')
        .classed(constants.nodeVersionTextClass, true)
        .style('text-anchor', 'middle')
        .style('dominant-baseline', 'central')
        .attr('stroke', 'black')
        .attr('stroke-width', 4)
        .attr('x', x).attr('y', y)
        .attr('font-size', 30);

    updateNodeTier(backgroundText);

    const tspan = el.append('text').attr('fill', 'white')
        .attr('class', 'overclockFont')
        .classed(constants.nodeVersionTextClass, true)
        .style('text-anchor', 'middle')
        .style('dominant-baseline', 'central')
        .attr('x', x).attr('y', y)
        .attr('font-size', 30);

    updateNodeTier(tspan);


};

export const insertNodeTier = (gEl) => {
    // const el = gEl.append('g').attr('text-anchor', 'middle').attr('dy', '-' + (nwords - 1) * 7.5);
    const el = gEl.append('g').attr('id', function (d) {
        return 'node-level-accessor-' + d.id;
    });
    updateNodeTierExternal(el);
};

export const insertNodeOverclock = (gEl) => {
    // const el = gEl.append('g').attr('text-anchor', 'middle').attr('dy', '-' + (nwords - 1) * 7.5);
    const el = gEl
        .filter(function (d) {
            return !['Container', 'Logistic'].includes(d.machine.name)
        })
        .append('g').attr('text-anchor', 'middle').attr('dy', 0);

    el.append('circle').attr('r', 17).attr('fill', '#FFFFFF').attr('cx', 32).attr('cy', -38).attr('stroke', 'black').attr('stroke-width', 1);

    const tspan = el.append('text').attr('fill', 'black')
        .attr('class', 'overclockFont')
        .classed(constants.overclockedTextClass, true)
        .attr('x', 32).attr('dy', -32)
        .attr('font-size', 20)
        .attr('id', function (d) {
            return 'node-overclock-accessor-' + d.id;
        })

    updateOverclock(tspan);
};