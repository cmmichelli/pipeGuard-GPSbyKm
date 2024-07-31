class ThingsBoardServiceWrapper {
    constructor(ctx) {
        this.ctx = ctx;
        this.$injector = ctx.$scope.$injector;
        this.assetService = this.$injector.get(ctx.servicesMap.get('assetService'));
        this.deviceService = this.$injector.get(ctx.servicesMap.get('deviceService'));
        this.attributeService = this.$injector.get(ctx.servicesMap.get('attributeService'));
        this.telemetryService = this.$injector.get(ctx.servicesMap.get('telemetryWsService'));

        this.ductos = [];
        this.tramos = [];
        this.instancias = [];
        this.max = 0;
    }

    async init() {
        await this.getAssets(this.createQuery('Ducto'), 'ductos');
        await this.getAssets(this.createQuery('DUCTOTRAMO'), 'tramos');
        await this.getDevices(this.createDeviceQuery(), 'instancias');
    }

    createQuery(assetType) {
        return {
            relationType: 'Contains',
            assetTypes: [assetType],
            parameters: {
                rootId: '57cc58f0-0358-11ef-a371-213c0938d71f', // hardcoded
                rootType: 'ASSET',
                direction: 'FROM',
                maxLevel: 4,
                fetchLastLevelOnly: false
            }
        };
    }

    createDeviceQuery() {
        return {
            relationType: 'Contains',
            deviceTypes: ['Instancia Deteccion'],
            parameters: {
                rootId: '57cc58f0-0358-11ef-a371-213c0938d71f', // hardcoded
                rootType: 'ASSET',
                direction: 'FROM',
                maxLevel: 5,
                fetchLastLevelOnly: false
            }
        };
    }

    getAssets(query, assetsMember) {
        return new Promise((resolve, reject) => {
            if (query.parameters.rootId) {
                this.assetService.findByQuery(query).subscribe(
                    (assets) => {
                        this[assetsMember] = assets;
                        resolve(assets);
                    },
                    (e) => {
                        console.error(e);
                        reject(e);
                    }
                );
            } else {
                reject('No rootId specified');
            }
        });
    }

    getDevices(query, devicesMember) {
        return new Promise((resolve, reject) => {
            if (query.parameters.rootId) {
                this.deviceService.findByQuery(query).subscribe(
                    (devices) => {
                        this[devicesMember] = devices;
                        resolve(devices);
                    },
                    (e) => {
                        console.error(e);
                        reject(e);
                    }
                );
            } else {
                reject('No rootId specified');
            }
        });
    }

    getAttributes(entities, attributeScope, keys) {
        return new Promise((resolve, reject) => {
            let promises = [];
            entities.forEach(entity => {
                promises.push(
                    new Promise((res, rej) => {
                        this.attributeService.getEntityAttributes(entity.id, attributeScope, keys).subscribe(
                            (attributes) => {
                                attributes.forEach(attribute => {
                                    const val = this.getMetros(attribute.value);
                                    entity[attribute.key.replace(/\s/g, '')] = val;
                                    if (this.max < val) {
                                        this.max = val;
                                    }
                                });
                                res(attributes);
                            },
                            (error) => rej(error)
                        );
                    })
                );
            });

            Promise.all(promises).then(resolve).catch(reject);
        });
    }

    getTelemetry(entityId, keys, startTs, endTs, limit = 100, agg = 'NONE', interval = 1000, orderBy = 'ASC', useStrictDataTypes = false) {
        return new Promise((resolve, reject) => {
            this.attributeService.getEntityTimeseries(entityId, keys, startTs, endTs, limit, agg, interval, orderBy, useStrictDataTypes).subscribe(
                (data) => {
                    resolve(data);
                },
                (error) => {
                    console.error('Failed to get telemetry data:', error);
                    reject(error);
                }
            );
        });
    }

    getMetros(valor) {
        const partes = valor.split('+');
        return partes.length === 2 ? parseFloat(partes[0]) * 1000 + parseFloat(partes[1]) : 0;
    }

    // Métodos para acceder a los datos
    getDuctos() {
        return this.ductos;
    }

    getTramos() {
        return this.tramos;
    }

    getInstanciasDeteccion() {
        return this.instancias;
    }

    forceUpdate() {
        return this.init();
    }
}

function convertToTimestamp(dateString) {
    // Reemplazar 'T' por un espacio y quitar el 'Z' si existe
    dateString = dateString.replace('T', ' ').replace('Z', '');

    // Convertir la cadena a un objeto Date
    const date = new Date(dateString);

    // Obtener el timestamp en milisegundos
    const timestamp = date.getTime();

    return timestamp;
}

// Exportar la clase para que pueda ser utilizada en otros archivos
export default ThingsBoardServiceWrapper;
