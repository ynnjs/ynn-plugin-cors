#!/usr/bin/env node

const Ynn = require( 'ynn' );
const app = new Ynn( {
    root : __dirname,
    debugging : true,
    logging : false,
} );

require.main === module && app.listen( Ynn.cargs.port );
module.exports = app;
