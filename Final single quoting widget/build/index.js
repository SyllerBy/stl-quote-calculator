( function( blocks, element ) {
    var el = element.createElement;
    blocks.registerBlockType( 'stlq/widget', {
        title: 'STL Quote Widget',
        icon: 'cart',
        category: 'widgets',
        edit: function() {
            return el('p', {}, 'STL Quote Widget will appear here on the frontend.');
        },
        save: function() {
            return null;
        }
    });
} )(
    window.wp.blocks,
    window.wp.element
);
