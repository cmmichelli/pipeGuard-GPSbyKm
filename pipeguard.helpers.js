class ThingsBoardServiceWrapper {
    constructor(ctx) {
        this.ctx = ctx;
        this.$injector = ctx.$scope.$injector;
        this.assetService = this.$injector.get(ctx.servicesMap.get('assetService'));
        this.deviceService = this.$injector.get(ctx.servicesMap.get('deviceService'));
        this.attributeService = this.$injector.get(ctx.servicesMap.get('attributeService'));
        this.telemetryService = this.$injector.get(ctx.servicesMap.get('telemetryWsService'));
        this.broadcastService = this.$injector.get(self.ctx.servicesMap.get('broadcastService'));

        this.ductos = [];
        this.tramos = [];
        this.instancias = [];
        this.max = 0;
        this.allowedFilterFields =  [ 'ductoname','tramoname','instancia_deteccion', 'Estado', 'Municipio','LeakLocationMts','LeakLocationKms', 'LeakAlarm', 'EstadoDucto','KmMinimo', 'KmMaximo']; // Define aquí los campos permitidos
    }

    async init() {
        var rootId = '57cc58f0-0358-11ef-a371-213c0938d71f'; // hardcoded
        await this.getAssets(this.createAssetQuery(['Ducto'], rootId), 'ductos');
        await this.getAssets(this.createAssetQuery(['DUCTOTRAMO'], rootId), 'tramos');
        await this.getDevices(this.createDeviceQuery(['Instancia Deteccion'], rootId), 'instancias');
    }
    
    createAssetQuery(assetTypes, rootId) {
        return {
            relationType: 'Contains',
            assetTypes: assetTypes,
            parameters: {
                rootId: rootId, 
                rootType: 'ASSET',
                direction: 'FROM',
                maxLevel: 4,
                fetchLastLevelOnly: false
            }
        };
    }

    createDeviceQuery(deviceTypes, rootId) {
        return {
            relationType: 'Contains',
            deviceTypes: deviceTypes,
            parameters: {
                rootId: rootId, 
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

    async getAttributesSynchronously(entities, attributeScope, keys) {
        try {
            await this.getAttributes(entities, attributeScope, keys);
        } catch (error) {
            console.error("Error fetching attributes:", error);
        }
    }

    getTelemetry(entityId, keys, startTs, endTs, limit = 10000, agg = 'NONE', interval = 1000, orderBy = 'ASC', useStrictDataTypes = false) {
        console.log(`getTelemetry: Iniciando con entityId=${entityId.id}, entityType=${entityId.entityType}, startTs=${startTs}, endTs=${endTs}, keys=`, keys); 
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

    
    getAlarms(entityId, startTs, endTs, filters = {}) {
        console.log(`getAlarms: Iniciando con entityId=${entityId.id}, entityType=${entityId.entityType}, startTs=${startTs}, endTs=${endTs}, filters=`, filters);        
        const keys = [];
        if (filters.LeakAlarm === 'All' || !filters.LeakAlarm) {
            keys.push('MapLeakLocation');
            keys.push('FugaConfirmada');
        } else {
            if (filters.LeakAlarm === 'ReportedLeak') keys.push('MapLeakLocation');
            if (filters.LeakAlarm === 'ConfirmedLeak') keys.push('FugaConfirmada');
        }
    
        return new Promise((resolve, reject) => {
            this.getTelemetry(entityId, keys, startTs, endTs).then((data) => {
                let telemetryData = [];
                if (keys.includes('MapLeakLocation') && data['MapLeakLocation']) {
                    telemetryData = telemetryData.concat(data['MapLeakLocation'].map(item => ({ ...item, LeakAlarm: 'ReportedLeak' })));
                }
                if (keys.includes('FugaConfirmada') && data['FugaConfirmada']) {
                    telemetryData = telemetryData.concat(data['FugaConfirmada'].map(item => ({ ...item, LeakAlarm: 'ConfirmedLeak' })));
                }
    
                if (telemetryData.length === 0) {
                    console.log('getAlarms: No data found for the specified keys');
                    return resolve([]);
                }
                console.log('getAlarms: Data found for the specified keys (telemetryData): ', telemetryData.length);
                const parsedData = telemetryData.map(item => {
                    try {
                        const parsedValue = JSON.parse(item.value);
                        parsedValue.ts = item.ts;
                        parsedValue.LeakAlarm = item.LeakAlarm;
    
                        // Flatten registros[0] if it exists
                        if (parsedValue.registros && parsedValue.registros[0]) {
                            Object.assign(parsedValue, parsedValue.registros[0]);
                            delete parsedValue.registros;
                        }
                        return parsedValue;
                    } catch (error) {
                        console.error('getAlarms: Error parsing item value:', item.value, error);
                        return null;
                    }
                }).filter(item => item !== null);
    
                const filteredData = parsedData.filter(item => {
                    return Object.keys(filters).every(key => {
                        if (key === 'KmMinimo') {
                            return item.LeakLocationKms >= filters[key];
                        } else if (key === 'KmMaximo') {
                            return item.LeakLocationKms <= filters[key];
                        } else if (key !== 'LeakAlarm') {
                            return item[key] === filters[key];
                        }
                        return true;
                    });
                });
                console.log('getAlarms: Data filtered: ', filteredData.length);
                resolve(filteredData);
            }).catch(error => {
                console.error('getAlarms: Error getting telemetry data:', error);
                reject(error);
            });
        });
    }
    
    async getAlarmsForEntity(entityName, entityType, startTs, endTs, filters = {}) {
        console.log(`getAlarmsForEntity: Iniciando con entityName=${entityName}, entityType=${entityType}, startTs=${startTs}, endTs=${endTs}, filters=`, filters);
        
        filters = this.#filterValidFields(filters);
        console.log(`getAlarmsForEntity: Iniciando con entityName=${entityName}, entityType=${entityType}, startTs=${startTs}, endTs=${endTs}, validFilters=`, filters);
        
        let relevantTramos = [];
        let relevantInstancias = [];
    
        try {
            if (entityType === 'Ducto') {
                if (entityName === '*') {
                    // Obtener todos los tramos de todos los ductos
                    console.log('getAlarmsForEntity: Obteniendo todos los ductos');
                    const ductos = this.ductos; // Ductos precargados
                    for (let ducto of ductos) {
                        console.log(`getAlarmsForEntity: Obteniendo tramos para ducto con rootId=${ducto.id.id}`);
                        relevantTramos = relevantTramos.concat(await this.getAssets(this.createAssetQuery(['DUCTOTRAMO'], ducto.id.id), 'tramos'));
                    }
                } else {
                    // Obtener todos los tramos de un ducto específico
                    const ducto = this.getFilteredDuctos({ name: entityName })[0];
                    if (!ducto) {
                        throw new Error(`Ducto con nombre '${entityName}' no encontrado.`);
                    }
                    console.log(`getAlarmsForEntity: Obteniendo tramos para ducto específico con rootId=${ducto.id.id}`);
                    relevantTramos = await this.getAssets(this.createAssetQuery(['DUCTOTRAMO'], ducto.id.id), 'tramos');
                }
            } else if (entityType === 'Tramo') {
                if (entityName === '*') {
                    // Obtener todos los tramos
                    console.log('getAlarmsForEntity: Obteniendo todos los tramos');
                    relevantTramos = this.tramos; // Tramos precargados
                } else {
                    // Obtener un tramo específico
                    const tramo = this.getFilteredTramos({ name: entityName })[0];
                    if (!tramo) {
                        throw new Error(`Tramo con nombre '${entityName}' no encontrado.`);
                    }
                    console.log(`getAlarmsForEntity: Obteniendo tramo específico con rootId=${tramo.id.id}`);
                    relevantTramos.push(tramo);
                }
            } else {
                throw new Error("Tipo de entidad no válido. Debe ser 'Ducto' o 'Tramo'.");
            }
            console.log('relevantTramos:', relevantTramos)
            for (let tramo of relevantTramos) {
                console.log(`getAlarmsForEntity: Obteniendo instancias para tramo con rootId=${tramo.id.id}`);
                relevantInstancias = relevantInstancias.concat(await this.getDevices(this.createDeviceQuery(['Instancia Deteccion'], tramo.id.id), 'instancias'));
            }
            console.log('relevantInstancias:', relevantInstancias)
    
            let allAlarms = [];
            for (let instancia of relevantInstancias) {
                console.log('getAlarmsForEntity: Obteniendo alarmas para instancia con entityId: ', instancia.id);
                const alarms = await this.getAlarms(instancia.id, startTs, endTs, filters);
                console.log('Alarmas encontradas: ', alarms);
                allAlarms = allAlarms.concat(alarms);
            }
    
            console.log(`getAlarmsForEntity: Se encontraron ${allAlarms.length} alarmas`);
            return allAlarms;
        } catch (error) {
            console.error('Error en getAlarmsForEntity:', error);
            throw error;
        }
    }


    async getAlarmsForDucto(ductoName, startTs, endTs, filters = {}) {
        return await this.getAlarmsForEntity(ductoName, 'Ducto', startTs, endTs, filters);
    }
    
    async getAlarmsForTramo(tramoName, startTs, endTs, filters = {}) {
        return await this.getAlarmsForEntity(tramoName, 'Tramo', startTs, endTs, filters);
    }

    sendBoardcast(id, data) { 
        //aca enviamos datos a otros widget del dashboars state actual
        this.broadcastService.broadcast(id, data);
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

    // Función privada de filtrado genérico
    // Los campos Name y Label permiten busqueda no exacta (que contiene un valor)
    #filterItems(items, filters) {
        return items.filter(item => {
            return Object.keys(filters).every(key => {
                if (filters[key] === '*') {
                    return true; // Si es * entonces ignora este filtro y sigue evaluando los demás
                }                
                if (key === 'name' || key === 'label') {
                    return item[key].includes(filters[key]);
                } else if (filters[key] instanceof RegExp) {
                    return filters[key].test(item[key]);
                } else {
                    return item[key] === filters[key];
                }
            });
        });
    }

    #filterValidFields(filterObject) {
        const filteredObject = {};
        //if the value ios '*' then skip the filter
        for (let key in filterObject) {
            if (this.allowedFilterFields.includes(key) && filterObject[key] !== '*') {
                filteredObject[key] = filterObject[key];
            }
        }
        return filteredObject;
    }
    
    // Función pública para filtrar ductos
    getFilteredDuctos(filters) {
        return this.#filterItems(this.ductos, filters);
    }

    // Función pública para filtrar tramos
    getFilteredTramos(filters) {
        return this.#filterItems(this.tramos, filters);
    }

    // Función pública para filtrar instancias
    getFilteredInstancias(filters) {
        return this.#filterItems(this.instancias, filters);
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

