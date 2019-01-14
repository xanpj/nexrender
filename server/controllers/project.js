'use strict';

const shortid   = require('shortid');
const low       = require('lowdb');

const SERVER_DB_PATH = process.env.SERVER_DB_PATH || 'db.json';

let initialized = false;

/*CUSTOM*/
const fs = require('fs')
const blockScript = './INSTANCE_BLOCK';
const stopScript = './INSTANCE_STOP';
/*CUSTOM*/

class Controller {

    /**
     * Called on loading, creates db connection
     * Binds methods
     */
    initialize() {
        initialized = true;

        // load file sync database
        var db = low(SERVER_DB_PATH);
            db.defaults({ projects: [] }).value();
        this.db = db.get('projects');

        // bind useful findAll method
        this.db.findAll = function(query) {
            var query = query || {};

            if (query.uid) {
                return this.find( query ).value();
            }

            return this.chain().filter( query ).value().filter( n => n !== null );
        };
    }

    /**
     * Called on POST request
     * @param  {Object} data JSON project
     * @return {Promise}
     */
    create(data) {
        if (!initialized) this.initialize();

        // set default data
        data.uid = data.uid || shortid();
        data.state = data.state || 'queued';
        data.createdAt = new Date;
        data.updatedAt = new Date;

        // save data
        this.db.push(data).value();

        /** CUSTOM: MANAGE GCP INSTANCE **/
        var INSTANCE_BLOCK = false;
        var INSTANCE_STOP = false;
        try {
          INSTANCE_BLOCK = fs.existsSync(blockScript)
        } catch(err){}
        try {
          INSTANCE_STOP = fs.existsSync(stopScript)
        } catch(err){}
        const Compute = require('@google-cloud/compute');
        const compute = new Compute();
        const zone = compute.zone('us-east1-b');
        const vm = zone.vm('instance-1');
        if(!INSTANCE_STOP && !INSTANCE_BLOCK){
          vm.get().then(function(data) {
            const running = (data[0].metadata.status == "RUNNING");
            if(!running){
              vm.start().then(function(data) {
                console.log(Date.now() + " SERVER INSTANCE STARTED")
              }).catch(function(err) {
                new Error("ERROR: SERVER INSTANCE NOT STARTED\n" + err);
              });
            }
          });

        }
        if(INSTANCE_STOP) {
          vm.stop().then(function(data) {
            console.log(Date.now() + " SERVER INSTANCE STOPPED")
          }).catch(function(err) {
            new Error("ERROR: SERVER INSTANCE NOT STOPPED\n" + err);
          });
        }
        /** CUSTOM: MANAGE GCP INSTANCE **/

        // return promise and get last added project
        return new Promise((resolve, reject) => {
            resolve( this.db.last() );
        });
    }

    /**
     * Called on GET request
     * @optional @param {Number} id Project uid
     * @return {Promise}
     */
    get(id) {
        if (!initialized) this.initialize();

        // get project by id, or get all items if id not provided
        return new Promise((resolve, reject) => {
            resolve( this.db.findAll( id ? { uid: id } : {} ) || reject( {} ).value() );
        });
    }

    /**
     * Called on PUT request
     * @param {Number} id Project uid
     * @param  {Object} data JSON project
     * @return {Promise}
     */
    update(id, data) {
        if (!initialized) this.initialize();

        // set default data
        data.updatedAt = new Date;

        // update data and return
        return new Promise((resolve, reject) => {
            resolve( this.db.chain().find({ uid: id }).assign( data ).value() );
        });
    }

    /**
     * Called on DELETE request
     * @param  {Number} id Project uid
     * @return {Promise}
     */
    delete(id) {
        if (!initialized) this.initialize();

        // remove project by id
        return new Promise((resolve, reject) => {
            resolve( this.db.remove({ uid : id }).value() );
        });
    }
}

module.exports = new Controller;
