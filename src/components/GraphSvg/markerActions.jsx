export const appendMarkerAttributes = (marker) => {
    return marker.attr('viewBox', '0 -5 10 10')
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5');
};