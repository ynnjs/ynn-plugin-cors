const url = require( 'url' );
const is = require( '@lvchengbin/is' );

module.exports = ( app, options ) => {
    app.preuse( ( ctx, next ) => {
        const whitelist = options.whitelist || app.config( 'cors.whitelist' );
        const origin = ctx.request.get( 'origin' );
        if( !whitelist ) return next();

        ctx.vary( 'Origin' );

        const parsed = url.parse( origin );
        const pieces = [
            parsed.hostname,
            parsed.host,
            parsed.protocol + '//' + parsed.host,
            parsed.protocol + '//' + parsed.hostname
        ];

        let matched;

        for( let item of whitelist ) {
            if( is.string( item ) || is.regexp( item ) ) {
                item = { origin : item };
            }

            if( is.string( item.origin ) ) {
                if( pieces.indexOf( item.origin ) === -1 ) continue;
            } else if( is.regexp( item.origin ) ) {
                let match = false;
                for( const piece of pieces ) {
                    if( item.origin.test( piece ) ) {
                        match = true;
                        break;
                    }
                }
                if( !match ) continue;
            }

            matched = item;
            break;
        }

        if( !matched ) return next();

        ctx.set( 'Access-Control-Allow-Origin', origin );

        if( matched.credentials ) {
            ctx.set( 'Access-Control-Allow-Credentials', 'true' );
        }

        if( ctx.method === 'OPTIONS' ) {

            /**
             * if the Access-Control-Request-Method is empty
             * the request is not a preflight request.
             */
            if( !ctx.get( 'Access-Control-Request-Method' ) ) {
                return next();
            }


            if( matched.headers ) {
                ctx.set( 'Access-Control-Allow-Headers', matched.headers.join( ',' ) );
            }

            if( matched.methods ) {
                ctx.set( 'Access-Control-Allow-Methods', matched.methods.join( ',' ).toUpperCase() );
            }

            if( matched.maxAge ) {
                ctx.set( 'Access-Control-Max-Age', matched.maxAge );
            }

            ctx.status = 204; 
        } else {

            if( matched.credentials ) {
                ctx.set( 'Access-Control-Allow-Credentials', 'true' );
            }

            if( matched.exposeHeaders ) {
                ctx.set( 'Access-Control-Expose-Headers', matched.exposeHeaders.join( ',' ) );
            }
            return next();
        }
    } );
}
