import {parse} from 'flatted/esm';
import pako from 'pako';
import Base64 from 'Base64';

export const spliceUtil = function (object, item) {
  if (object.indexOf(item) === -1) return;
  object.splice(object.indexOf(item), 1);
};

const inflate = (data) => parse(pako.inflate(Base64.atob(data), {to: 'string'}));

export const saveHash = (data) => {
  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'production') {
    console.log(data.data);
  }

  return new Promise((resolve, reject) => {
    return fetch('https://api.myjson.com/bins/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(data), // body data type must match "Content-Type" header
    }).then(response => response.json()).then(function (response) {
      if (response.uri) {
        const resp = response.uri.replace('https:\/\/api.myjson.com/bins//', '');
        return resolve(encodeURIComponent(Base64.btoa(resp)));
      }
      throw new Error('Invalid save');
    })
      .catch(function (error) {
        console.log('Fetch error:', error.message);
        reject(error);
      });
  });
};

// Compressed saved example layout for load screen
// const data = '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';

// Compressed data for empty screen
const data = 'eJwtiksKgDAMRO+StYj/RdfeQlwEDVosrSRFkOLdTUWYxbw3MyUQjFY2xnOPgW8wUEMBH48YUblRPh3exL9oVQgtTFGhg6dIcBGLDR5MVVZ1Fj6sJDr3+nXWH7kP+fplmjXzC9kcJxQ=';

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
        method: 'GET'
      }).then(response => response.json()).then(function (responseRaw) {
        resolve(inflate(responseRaw.data));
      })
        .catch(function (error) {
          resolve(inflate(data));
        });
    } else {
      console.log(JSON.stringify(inflate(data), null, 2));
      resolve(inflate(data));
    }
  });
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

const enabledExperimentalFeatures = ['stg', 'opt'];

export const useExperimentalFeature = (featureName) => {
  const vars = {};
  window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
    vars[key] = value;
  });
  vars.useExperimentalFeatures = vars.useExperimentalFeatures || '';
  return (vars.useExperimentalFeatures || '').split(',').includes(featureName) || vars.useExperimentalFeatures === 'all' || enabledExperimentalFeatures.includes(featureName);
};
