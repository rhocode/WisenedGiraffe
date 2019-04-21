import {parse} from 'flatted/esm';
import pako from 'pako';
import Base64 from 'Base64';

export const spliceUtil = function (object, item) {
    if (object.indexOf(item) === -1) return;
    object.splice(object.indexOf(item), 1);
};

const inflate = (data) => parse(pako.inflate(Base64.atob(data), {to: 'string'}));

export const saveHash = (data) => {
    return new Promise((resolve, reject) => {
        return fetch('https://api.myjson.com/bins/', {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify(data), // body data type must match "Content-Type" header
        }).then(response => response.json()).then(function (response) {
            if (response.uri) {
                const resp = response.uri.replace('https:\/\/api.myjson.com/bins//', '');
                console.log(response.uri);
                console.log(resp);
                console.log(encodeURIComponent(Base64.btoa(resp)));
                return resolve(encodeURIComponent(Base64.btoa(resp)));
            }
            throw new Error("Invalid save");
        })
            .catch(function (error) {
                console.log('Fetch error:', error.message);
                reject(error);
            });
    })
};

const data = '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';

export const loadHash = () => {
    return new Promise((resolve, reject) => {

        if (window.location.hash) {
            let location = null;
            if (window.location.hash.indexOf('?') === -1) {
                location = window.location.hash.slice(1);
            } else {
                location = window.location.hash.slice(1, window.location.hash.indexOf('?'));
            }

            return fetch('https://api.myjson.com/bins//' + Base64.atob(decodeURIComponent(location)), {
                method: "GET"
            }).then(response => response.json()).then(function (responseRaw) {
                resolve(inflate(responseRaw.data));
            })
                .catch(function (error) {
                    console.log('Fetch error:', error.message);
                    resolve(inflate(data));
                });
        } else {
            resolve(inflate(data));
        }
    })
};

export const rebuildQueryParams = () => {
    const vars = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value;
    });
    if (Object.keys(vars).length) {
        return '?' + Object.keys(vars).map(k => k + '=' + vars[k]).join('&');
    }

    return '';
};

export const useExperimentalFeature = (featureName) => {
    const vars = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value;
    });
    vars.useExperimentalFeatures = vars.useExperimentalFeatures || '';
    return (vars.useExperimentalFeatures || '').split(',').includes(featureName) || vars.useExperimentalFeatures === 'all'
};

var multiCrowbar = (function() {
    /*
     * SVG Export
     * converts html labels to svg text nodes
     * will produce incorrect results when used with multi-line html texts
     *
     * Author: Gregor Aisch
     * based on https://github.com/NYTimes/svg-crowbar/blob/gh-pages/svg-crowbar-2.js
     */

    window.d3 = null;
    var s = document.createElement('script');
    s.src = 'https://d3js.org/d3.v3.min.js';
    document.getElementsByTagName('head')[0].appendChild(s);
    function check() {
        if (!window.d3) return setTimeout(check, 200);
        console.log('ready...');
        // run('body');
    }
    check();
    var doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

    var fontFamilyMapping = {
        'nyt-franklin': 'NYTFranklin'
    };

    return function(cont, label_selector) {
        var parent = d3.select(cont),
            parent_n = parent.node();

        var out_w = parent_n.nodeName == 'body' ? parent_n.scrollWidth : parent_n.clientWidth,
            out_h = parent_n.nodeName == 'body' ? parent_n.scrollHeight: parent_n.clientHeight;

        var labels = label_selector ? parent.selectAll(label_selector) : null,
            nodes = parent.selectAll('path, line, rect, circle, text'),
            copydefs = parent.selectAll('linearGradient,radialGradient,filter,pattern,clipPath');
        // divs = parent.selectAll('.export-rect,.rect'),
        // circles = parent.selectAll('.circle');


        var svgNodes = parent.selectAll('svg');

        // 1. create a new svg container of the size of the page
        var out = parent.append('svg');

        // empty css declaration
        var emptyCSS = window.getComputedStyle(out.node());

        out.attr({ width: out_w, height: out_h })
            .style({ position: 'absolute', left: 0, top: 0 });

        var out_defs = out.append('defs');

        copydefs.each(function() {
            var el = this;
            var cloned = el.cloneNode(true);
            out_defs.node().appendChild(cloned);
        });

        // top offset to parent element
        var offsetTop = parent_n.getBoundingClientRect().top,
            offsetLeft = parent_n.getBoundingClientRect().left;// - parent_n.parentNode.getBoundingClientRect().top;

        var out_g = out.append('g').attr('id', 'svg');

        nodes.each(function() {
            var el = this,
                cur = el,
                curCSS,
                bbox,
                transforms = [];
            while (cur) {
                curCSS = getComputedStyle(cur);
                if (cur.nodeName == 'defs') return;
                if (cur.nodeName != 'svg') {
                    // check node visibility
                    transforms.push(attr(cur, 'transform'));
                    cur = cur.parentNode;
                } else {
                    bbox = cur.getBoundingClientRect();
                    transforms.push('translate('+[bbox.left - offsetLeft, bbox.top - offsetTop]+')');
                    cur = null;
                }
                if (isHidden(curCSS)) return;
            }
            transforms = transforms.filter(function(d) { return d; }).reverse();
            var cloned = el.cloneNode(true);
            cloned.setAttribute('transform', transforms.join(' '));

            // copy all computed style attributes
            explicitlySetStyle(el, cloned);
            out_g.node().appendChild(cloned);
        });

        if (labels) {
            out_g = out.append('g').attr('id', 'text');

            labels.each(function() {
                // create a text node for each label
                var el = this,
                    cur = el,
                    bbox = el.getBoundingClientRect(),
                    align = 'left',
                    content = el.innerText,
                    transforms = [];

                var lblPos = { x: bbox.left - offsetLeft, y: bbox.top - offsetTop };

                var txt = out_g.append('text')
                    .text(content)
                    .attr({ x: lblPos.x });

                copyTextStyles(el, txt.node());

                txt.attr('y', lblPos.y)
                    .style('dominant-baseline', 'text-before-edge');

                bbox = txt.node().getBoundingClientRect();
                txt.attr('y', lblPos.y+bbox.height).style('dominant-baseline', 'text-after-edge');
            });
        }

        download(out.node(), cont.replace(/\.#/g, ''));

        out.remove();

        // labels.remove();
        // svgNodes.remove();

        function isHidden(css) {
            return css.display == 'none' ||
                css.visibility == 'hidden' ||
                +css.opacity === 0 ||
                (+css.fillOpacity === 0 || css.fill == 'none') &&
                (css.stroke == 'none' || !css.stroke || +css.strokeOpacity === 0);
        }

        function explicitlySetStyle(element, target) {
            var elCSS = getComputedStyle(element),
                i, len, key, value,
                computedStyleStr = "";
            for (i=0, len=elCSS.length; i<len; i++) {
                key=elCSS[i];
                value=elCSS.getPropertyValue(key);
                if (value!==emptyCSS.getPropertyValue(key)) {
                    if (key == 'font-family' && fontFamilyMapping[value]) value = fontFamilyMapping[value];
                    computedStyleStr+=key+":"+value+";";
                }
            }
            target.setAttribute('style', computedStyleStr);
        }

        function copyTextStyles(element, target) {
            var elCSS = getComputedStyle(element),
                i, len, key, value,
                computedStyleStr = "";
            for (i=0, len=elCSS.length; i<len; i++) {
                key=elCSS[i];
                if (key.substr(0,4) == 'font' || key.substr(0,4) == 'text' || key == 'color') {
                    value=elCSS.getPropertyValue(key);
                    if (key == 'color') key = 'fill';
                    if (value!==emptyCSS.getPropertyValue(key)) {
                        if (key == 'font-family' && fontFamilyMapping[value]) value = fontFamilyMapping[value];
                        computedStyleStr+=key+":"+value+";";
                    }
                }
            }
            target.setAttribute('style', computedStyleStr);
        }

        function download(svg, filename) {
            var source = (new XMLSerializer()).serializeToString(svg);
            var url = window.URL.createObjectURL(new Blob([doctype + source], { "type" : "text\/xml" }));
            var a = document.createElement("a");
            document.body.appendChild(a);
            a.setAttribute("class", "svg-crowbar");
            a.setAttribute("download", filename + ".svg");
            a.setAttribute("href", url);
            a.style.display = "none";
            a.click();

            setTimeout(function() {
                window.URL.revokeObjectURL(url);
            }, 10);
        }

        function attr(n, v) { return n.getAttribute(v); }

    };

});