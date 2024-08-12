class KPIAlarmHelper {
    constructor(alarms) {
        this.alarms = alarms;
    }

    countAlarmsByDucto() {
        const alarmsByDucto = {};

        this.alarms.forEach(alarm => {
            const { ductoname } = alarm;

            if (!alarmsByDucto[ductoname]) {
                alarmsByDucto[ductoname] = 0;
            }
            alarmsByDucto[ductoname]++;
        });

        return alarmsByDucto;
    }

    countAlarmsByTramo(ductoName = null) {
        const alarmsByTramo = {};

        this.alarms.forEach(alarm => {
            const { ductoname, tramoname } = alarm;

            if (!ductoName || ductoname === ductoName) {
                if (!alarmsByTramo[tramoname]) {
                    alarmsByTramo[tramoname] = 0;
                }
                alarmsByTramo[tramoname]++;
            }
        });

        return alarmsByTramo;
    }

    countAlarmsByInstancia(ductoName = null, tramoName = null) {
        const alarmsByInstancia = {};

        this.alarms.forEach(alarm => {
            const { ductoname, tramoname, instancia_deteccion } = alarm;

            if ((!ductoName || ductoname === ductoName) && (!tramoName || tramoname === tramoName)) {
                if (!alarmsByInstancia[instancia_deteccion]) {
                    alarmsByInstancia[instancia_deteccion] = 0;
                }
                alarmsByInstancia[instancia_deteccion]++;
            }
        });

        return alarmsByInstancia;
    }

    countAlarmsByMunicipio(ductoName = null) {
        const alarmsByMunicipio = {};

        this.alarms.forEach(alarm => {
            const { ductoname, Municipio } = alarm;

            if (!ductoName || ductoname === ductoName) {
                if (!alarmsByMunicipio[Municipio]) {
                    alarmsByMunicipio[Municipio] = 0;
                }
                alarmsByMunicipio[Municipio]++;
            }
        });

        return alarmsByMunicipio;
    }

    countAlarmsByEstado(ductoName = null) {
        const alarmsByEstado = {};

        this.alarms.forEach(alarm => {
            const { ductoname, Estado } = alarm;

            if (!ductoName || ductoname === ductoName) {
                if (!alarmsByEstado[Estado]) {
                    alarmsByEstado[Estado] = 0;
                }
                alarmsByEstado[Estado]++;
            }
        });

        return alarmsByEstado;
    }

    countAlarmsByKilometro(ductoName = null) {
        const alarmsByKilometro = {};

        this.alarms.forEach(alarm => {
            const { ductoname, LeakLocationKms } = alarm;

            if (!ductoName || ductoname === ductoName) {
                const kilometro = 'KM ' + Math.floor(LeakLocationKms).toString();

                if (!alarmsByKilometro[kilometro]) {
                    alarmsByKilometro[kilometro] = 0;
                }
                alarmsByKilometro[kilometro]++;
            }
        });

        return alarmsByKilometro;
    }
    
    getKPI(kpiName, ...args) {
        switch (kpiName) {
            case 'alarmsByDucto':
                return this.countAlarmsByDucto(...args);
            case 'alarmsByTramo':
                return this.countAlarmsByTramo(...args);
            case 'alarmsByInstancia':
                return this.countAlarmsByInstancia(...args);
            case 'alarmsByMunicipio':
                return this.countAlarmsByMunicipio(...args);
            case 'alarmsByEstado':
                return this.countAlarmsByEstado(...args);
            case 'alarmsByKilometro':
                return this.countAlarmsByKilometro(...args);
            default:
                throw new Error(`KPI ${kpiName} no es válido. Valores posibles: "alarmsByDucto, alarmsByTramo, alarmsByInstancia, alarmsByMunicipio, alarmsByEstado, alarmsByKilometro"`);
        }
    }
}