'use strict';

/*jshint expr: true*/

const expect = require( 'chai' ).expect;

const freshy = require( 'freshy' );

const LambdaTester = require( 'lambda-tester' );

const jwtSimple = require( 'jwt-simple' );

const sinon = require( 'sinon' );

const configUtils = require( './lib/config-utils' );

//require( '../lib/logger' ).setLevel( 'debug' );

describe( 'index', function() {

    var vandium;

    before( function( done ) {

        configUtils.removeConfig( done );
    });

    after( function( done ) {

        configUtils.removeConfig( done );
    });

    beforeEach( function() {

        freshy.unload( '../index' );
        freshy.unload( '../lib/config' );
        freshy.unload( '../lib/jwt' );
    });

	describe( '.vandium', function() {

		it( 'simple wrap with no jwt or validation', function() {

            vandium = require( '../index' );

            var handler = vandium( function( event, context ) {

                context.succeed( 'ok' );
            });

            return LambdaTester( handler )
                .expectSucceed( function( result ) {

                    expect( result ).to.equal( 'ok' );
                });
        });

        it( 'simple wrap with no jwt or validation using callback( null, result )', function() {

            vandium = require( '../index' );

            var handler = vandium( function( event, context, callback ) {

                callback( null, 'ok' );
            });

            return LambdaTester( handler )
                .expectResult( function( result ) {

                    expect( result ).to.equal( 'ok' );
                });
        });

        it( 'simple wrap with no jwt or validation using callback( err )', function() {

            vandium = require( '../index' );

            var handler = vandium( function( event, context, callback ) {

                callback( new Error( 'bang' ) );
            });

            return LambdaTester( handler )
                .expectError( function( err ) {

                    expect( err.message ).to.equal( 'bang' );
                });
        });

        it( 'simple wrap, return value', function() {

            vandium = require( '../index' );

            var handler = vandium( function( event, context ) {

                context.succeed( 'ok' );

                return 42;
            });

            var context = {

                succeed: sinon.stub(),

                fail: sinon.stub
            };

            // Can't use lambda-tester here (just yet!)
            expect( handler( {}, context ) ).to.equal( 42 );
            expect( context.succeed.calledOnce ).to.be.true;
            expect( context.succeed.withArgs( 'ok').calledOnce ).to.be.true;
        });

        it( 'simple validation', function() {

            vandium = require( '../index' );

            vandium.validation( {

                name: vandium.types.string().required(),

                age: vandium.types.number().min( 0 ).max( 120 ).required(),

                jwt: vandium.types.any()
            });

            vandium.jwt().configure( {

                algorithm: 'HS256',
                secret: 'super-secret'
            });

            var handler = vandium( function( event, context ) {

                context.succeed( 'ok' );
            });

            var token = jwtSimple.encode( { user: 'fred' }, 'super-secret', 'HS256' );

            return LambdaTester( handler )
                .event( { name: 'fred', age: 16, jwt: token } )
                .expectSucceed( function( result ) {

                    expect( result ).to.equal( 'ok' );
                });
        });

        it( 'simple validation with sql injection protection', function() {

            vandium = require( '../index' );

            vandium.validation( {

                name: vandium.types.string().required(),

                age: vandium.types.number().min( 0 ).max( 120 ).required(),

                jwt: vandium.types.any()
            });

            vandium.protect.sql.fail();

            vandium.jwt().configure( {

                algorithm: 'HS256',
                secret: 'super-secret'
            });

            var handler = vandium( function( event, context ) {

                context.succeed( 'ok' );
            });

            var token = jwtSimple.encode( { user: 'fred' }, 'super-secret', 'HS256' );

            return LambdaTester( handler )
                .event( { name: 'fred', age: 16, jwt: token } )
                .expectSucceed( function( result ) {

                    expect( result ).to.equal( 'ok' );
                });
        });

        it( 'validation where value is missing', function() {

            vandium = require( '../index' );

            vandium.validation( {

                name: vandium.types.string().required(),

                age: vandium.types.number().min( 0 ).max( 120 ).required()
            })

            var handler = vandium( function( event, context ) {

                context.succeed( 'ok' );
            });

            return LambdaTester( handler )
                .event( { name: 'fred' } )
                .expectError( function( err ) {

                    expect( err.message ).to.contain( 'validation error:' );
                });
        });

        it( 'handle resolve from a promise', function() {

            vandium = require( '../index' );

            var handler = vandium( function( /*event, context, callback*/ ) {

                return new Promise( function( resolve, reject ) {

                    setTimeout( function() {

                        resolve( 'ok' );

                    }, 200 );
                });
            });

            return LambdaTester( handler )
                .expectResult( function( result ) {

                    expect( result ).to.equal( 'ok' );
                });
        });

        it( 'handle reject from a promise', function() {

            vandium = require( '../index' );

            var handler = vandium( function( /*event, context, callback*/ ) {

                return new Promise( function( resolve, reject ) {

                    setTimeout( function() {

                        reject( new Error( 'bang' ) );

                    }, 200 );
                });
            });

            return LambdaTester( handler )
                .expectError( function( err ) {

                    expect( err.message ).to.equal( 'bang' );
                });
        });

        it( 'uncaught exceptions', function() {

            vandium = require( '../index' );

            let handler = vandium( function( /*event, context, callback*/ ) {

                throw new Error( 'bang' );
            });

            return LambdaTester( handler )
                .expectError( function( err ) {

                    expect( err.message ).to.equal( 'bang' );
                });
        });

        it( 'uncaught exceptions - disable logging', function() {

            vandium = require( '../index' );
            vandium.logUncaughtExceptions( false );

            let handler = vandium( function( /*event, context, callback*/ ) {

                throw new Error( 'bang' );
            });

            return LambdaTester( handler )
                .expectError( function( err ) {

                    expect( err.message ).to.equal( 'bang' );
                });
        });

        it( 'with after() async with handler calling callback( null, result )', function() {

            vandium = require( '../index' );

            let afterCalled = false;

            vandium.after( function( done ) {

                afterCalled = true;
                done();
            })

            let handler = vandium( function( event, context, callback ) {

                callback( null, 'ok' );
            });

            return LambdaTester( handler )
                .expectResult( function( result ) {

                    expect( result ).to.equal( 'ok' );
                    expect( afterCalled ).to.be.true;
                });
        });

        it( 'with after() async [calling done(err) ] with handler calling callback( null, result )', function() {

            vandium = require( '../index' );

            let afterCalled = false;

            vandium.after( function( done ) {

                afterCalled = true;
                done( new Error( 'bang' ) );
            })

            let handler = vandium( function( event, context, callback ) {

                callback( null, 'ok' );
            });

            return LambdaTester( handler )
                .expectResult( function( result ) {

                    expect( result ).to.equal( 'ok' );
                    expect( afterCalled ).to.be.true;
                });
        });

        it( 'with after() async with handler calling callback( err )', function() {

            vandium = require( '../index' );

            let afterCalled = false;

            vandium.after( function( done ) {

                afterCalled = true;
                done();
            })

            let handler = vandium( function( event, context, callback ) {

                callback( new Error( 'bang' ) );
            });

            return LambdaTester( handler )
                .expectError( function( err ) {

                    expect( err.message ).to.equal( 'bang' );
                    expect( afterCalled ).to.be.true;
                });
        });

        it( 'with after() sync with handler calling callback( result )', function() {

            vandium = require( '../index' );

            let afterCalled = false;

            vandium.after( function() {

                afterCalled = true;
            })

            let handler = vandium( function( event, context, callback ) {

                callback( null, 'ok' );
            });

            return LambdaTester( handler )
                .expectResult( function( result ) {

                    expect( result ).to.equal( 'ok' );
                    expect( afterCalled ).to.be.true;
                });
        });

        it( 'with after() promise and handler returning promise - result', function() {

            vandium = require( '../index' );

            let afterCalled = false;

            vandium.after( function() {

                afterCalled = true;

                return Promise.resolve();
            })

            let handler = vandium( function() {

                return Promise.resolve( 'ok' );
            });

            return LambdaTester( handler )
                .expectResult( function( result ) {

                    expect( result ).to.equal( 'ok' );
                    expect( afterCalled ).to.be.true;
                });
        });

        it( 'with after() promise and handler returning promise - error', function() {

            vandium = require( '../index' );

            let afterCalled = false;

            vandium.after( function() {

                afterCalled = true;
                return Promise.reject( new Error( 'bang' ) )
            })

            let handler = vandium( function() {

                return Promise.resolve( 'ok' );
            });

            return LambdaTester( handler )
                .expectResult( function( result ) {

                    expect( result ).to.equal( 'ok' );
                    expect( afterCalled ).to.be.true;
                });
        });

        it( 'with non-function after() call', function() {

            vandium = require( '../index' );

            vandium.after( 'not-a-function!' );

            let handler = vandium( function() {

                return Promise.resolve( 'ok' );
            });

            return LambdaTester( handler )
                .expectResult( function( result ) {

                    expect( result ).to.equal( 'ok' );
                });
        });

        it( 'with no-value after() call', function() {

            vandium = require( '../index' );

            vandium.after();

            let handler = vandium( function() {

                return Promise.resolve( 'ok' );
            });

            return LambdaTester( handler )
                .expectResult( function( result ) {

                    expect( result ).to.equal( 'ok' );
                });
        });

        it( 'Exception thrown in after() call', function() {

            vandium = require( '../index' );

            vandium.after( function() { throw new Error( 'bang' ); } );

            let handler = vandium( function() {

                return Promise.resolve( 'ok' );
            });

            return LambdaTester( handler )
                .expectResult( function( result ) {

                    expect( result ).to.equal( 'ok' );
                });
        });
	});

    describe( '.jwt', function() {

        it( 'normal operation', function() {

            vandium = require( '../index' );

            var jwt = vandium.jwt();

            // stage vars should be enabled by default
            expect( jwt.configuration() ).to.eql( { key: undefined, algorithm: undefined, tokenName: 'jwt', stageVars: true } );

            var jwtConfig = vandium.jwt().configure( { algorithm: 'HS256', secret: 'my-secret' } );
            expect( jwtConfig ).to.eql( { key: 'my-secret', algorithm: 'HS256', tokenName: 'jwt', stageVars: false } );

            // should still be set
            jwt = vandium.jwt();
            expect( jwt.configuration() ).to.eql( { key: 'my-secret', algorithm: 'HS256', tokenName: 'jwt', stageVars: false } );
        });
    });

    describe( '.validation', function() {

        it( 'normal operation', function() {

            vandium = require( '../index' );

            // no params should be ok
            vandium.validation();

            // call again with schema
            vandium.validation( {

                name: vandium.types.string()
            });
        });
    });

    describe( 'auto-configure', function() {

        before( function( done ) {

            configUtils.removeConfig( done );
        });

        after( function( done ) {

            configUtils.removeConfig( done );
        });

        it( 'auto update when vandium.json is present', function( done ) {

            configUtils.writeConfig( JSON.stringify( { jwt: { algorithm: 'HS256', secret: 'my-secret' } }), function( err ) {

                if( err ) {

                    return done( err );
                }

                vandium = require( '../index' );

                var config = require( '../lib/config' );

                // wait for config to load
                config.wait( function() {

                    var token = jwtSimple.encode( { user: 'fred' }, 'my-secret', 'HS256' );

                    var handler = vandium( function( event, context ) {

                        context.succeed( event.jwt.claims.user );
                    });

                    LambdaTester( handler )
                        .event( { jwt: token } )
                        .expectSucceed( function( result ) {

                            expect( result ).to.equal( 'fred' );
                            done();
                        })
                        .catch( done );
                });
            });
        });
    });
});
