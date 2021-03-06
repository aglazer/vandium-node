'use strict';

const _ = require( 'lodash' );

const config = require( './config' );

const validation = require( './validation' );

const protect = require( './protect' );

const STAGE_JWT = 10;

const STAGE_INPUT = 20;

const STAGE_EXEC = 30;

var jwt;		// JWT Validation

var postHandler = function( done ) { done(); };

var logUncaughtExceptions = true;

function validateJWT( event ) {

	if( jwt ) {

		jwt.validate( event );
	}
}

function validateInput( event ) {

	validation.verify( event );

	protect.scan( event );
}

function isPromise( value ) {

    return ( _.isFunction( value.then ) && _.isFunction( value.catch ) );
}

/**
 * @Promise
 */
function runPostHandler() {

    return new Promise( function( resolve,  reject ) {

        try {

            let retValue = postHandler( function( err ) {

                    if( err ) {

                        return reject( err );
                    }

                    resolve();
                });

            if( postHandler.length === 0 ) {

                // might be a promise or nothing
                return resolve( retValue );
            }
        }
        catch( err ) {

            reject( err );
        }
    });
}

function wrapCallback( callback ) {

    return function( error, result ) {

        return runPostHandler()
            .catch( function( err ) {

                console.log( '*** vandium - error running afterHandler function', err );
            })
            .then( function() {

                if( error ) {

                    callback( error );
                }
                else {

                    callback( null, result );
                }
            })
            // .catch( function( err ) will never throw an exception
    };
}

function wrapHandler( userFunc ) {

	return function( event, context, callback ) {

        let stage = 0;

		try {

            stage = STAGE_JWT;
			validateJWT( event );

            stage = STAGE_INPUT;
			validateInput( event );

            stage = STAGE_EXEC;

            callback = wrapCallback( callback );

			let retValue = userFunc( event, context, callback );

			if( retValue ) {

                if( isPromise( retValue ) ) {

					retValue
						.then( function( value ) {

                            callback( null, value );
						})
						.catch( function( err ) {

                            callback( err );
						});
				}
				else {

                    return retValue;
				}
			}
		}
		catch( err ) {

            if( logUncaughtExceptions && (stage === STAGE_EXEC) ) {

                console.log( '*** vandium - uncaught exception:', err );
            }

            callback( err );
		}
	};
}

function Vandium( userFunc ) {

	return wrapHandler( userFunc )
}

Vandium.after = function( afterHandlerFunction ) {

    if( _.isFunction( afterHandlerFunction ) ) {

        postHandler = afterHandlerFunction;
    }
}

Vandium.validation = function( schema ) {

	if( schema ) {

		validation.configure( schema );
	}

	return validation;
}

Vandium.jwt = function() {

	if( !jwt ) {

		jwt = require( './jwt' );
	}

	return jwt;
}

Vandium.protect = protect;

Vandium.logUncaughtExceptions = function( enable ) {

    logUncaughtExceptions = (enable === true);
}


Object.defineProperty( Vandium, 'types', {

	get: function() {

		return validation.types();
	}
});

config.on( "complete", function() {

	if( config.jwt ) {

		// enable JWT if configured
		Vandium.jwt();
	}
});


module.exports = Vandium;
