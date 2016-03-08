'use strict';

var expect = require( 'chai' ).expect;

var fs = require( 'fs' );

var file = require( '../../../lib/config/file' );

var configUtils = require( '../config-utils' );

process.env.LAMBDA_TASK_ROOT = require( 'app-root-path' ).path;

describe( 'lib/config/file', function() {

    var originalConfigData;

    before( function( done ) {

        configUtils.readConfig( function( err, content ) {

            originalConfigData = content;

            done();
        });
    });

    after( function( done ) {

        configUtils.writeConfig( originalConfigData, done );
    });

    describe( '.load', function() {

        var json = {

            one: 1,
            two: 'two',
            three: 'iii'
        };

        it( 'file exists', function( done ) {

            configUtils.writeConfig( JSON.stringify( json ), function( err ) {

                if( err ) {

                    return done( err );
                }

                file.load( function( err, content ) {

                    expect( err ).to.not.exist;
                    expect( content ).to.eql( json );

                    done();
                });
            })
        });

        it( 'file does not exist', function( done ) {

            configUtils.removeConfig( function() {

                file.load( function( err, content ) {

                    expect( err ).to.not.exist;
                    expect( content ).to.eql( {} )
                    done();
                });
            })
        });
    })
});
