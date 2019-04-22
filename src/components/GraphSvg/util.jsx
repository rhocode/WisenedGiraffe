import {parse} from 'flatted/esm';
import pako from 'pako';
import Base64 from 'Base64';

export const spliceUtil = function (object, item) {
    if (object.indexOf(item) === -1) return;
    object.splice(object.indexOf(item), 1);
};

const inflate = (data) => parse(pako.inflate(Base64.atob(data), {to: 'string'}));

export const saveHash = (data) => {
    console.log(data.data);
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
