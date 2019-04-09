const url = require( 'url' );
const vary = require( 'vary' );
const is = require( '@lvchengbin/is' );

module.exports = ( app, options = {} ) => {
    app.preuse( ( ctx, next ) => {
        const whitelist = options.whitelist || app.config( 'cors.whitelist' );
        const headers = options.headers || [];
        const origin = ctx.request.get( 'origin' );
        if( !whitelist ) return next();

        /**
         * for storing headers set for cors
         */
        const headerSet = {};

        function set( k, v ) {
            ctx.set( k, v );
            headerSet[ k ] = v;
        }

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

        set( 'Access-Control-Allow-Origin', origin );

        if( matched.credentials ) {
            set( 'Access-Control-Allow-Credentials', 'true' );
        }

        if( ctx.method === 'OPTIONS' ) {

            /**
             * if the Access-Control-Request-Method is empty
             * the request is not a preflight request.
             */
            if( !ctx.get( 'Access-Control-Request-Method' ) ) {
                return next();
            }

            /*
            if( options.allowAllHeaders !== false ) {
                set( 'Access-Control-Allow-Headers', Object.keys( ctx.headers ).join( ',' ) );
            } else {
            */
            const hds = [ ...headers ];

            if( matched.headers ) {
                hds.push( ...matched.headers );
            }

            if( hds.length ) {
                set( 'Access-Control-Allow-Headers', hds.join( ',' ) );
            }
            //}

            if( matched.methods ) {
                set( 'Access-Control-Allow-Methods', matched.methods.join( ',' ).toUpperCase() );
            }

            if( matched.maxAge ) {
                set( 'Access-Control-Max-Age', matched.maxAge );
            }

            ctx.status = 204; 
        } else {

            if( matched.credentials ) {
                set( 'Access-Control-Allow-Credentials', 'true' );
            }

            if( matched.exposeHeaders ) {
                set( 'Access-Control-Expose-Headers', matched.exposeHeaders.join( ',' ) );
            }
            /**
             * still to add headers even though the request failed.
             */
            return next().catch( e => {
                if( !e.headers ) e.headers = {};
                const varyWithOrigin = vary.append( e.headers.vary || e.headers.Vary || '', 'Origin' );
                delete e.headers.Vary;
                Object.assign( e.headers, headerSet, { vary : varyWithOrigin } );
                throw e;
            } );
        }
    } );
}

