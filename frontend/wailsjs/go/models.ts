export namespace models {
	
	export class FunctionButton {
	    label: string;
	    command: string;
	
	    static createFrom(source: any = {}) {
	        return new FunctionButton(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.label = source["label"];
	        this.command = source["command"];
	    }
	}
	export class ImageCounts {
	    remaining: number;
	    processed: number;
	
	    static createFrom(source: any = {}) {
	        return new ImageCounts(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.remaining = source["remaining"];
	        this.processed = source["processed"];
	    }
	}
	export class ImageInfo {
	    filename: string;
	    path: string;
	    index: number;
	    total: number;
	
	    static createFrom(source: any = {}) {
	        return new ImageInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filename = source["filename"];
	        this.path = source["path"];
	        this.index = source["index"];
	        this.total = source["total"];
	    }
	}
	export class ImageMetadata {
	    filename: string;
	    fileSize: number;
	    modifiedAt: string;
	    format: string;
	    width: number;
	    height: number;
	    dateTaken: string;
	    cameraMake: string;
	    cameraModel: string;
	    lensModel: string;
	    focalLength: string;
	    aperture: string;
	    shutterSpeed: string;
	    iso: string;
	    flash: string;
	    gpsLat: number;
	    gpsLon: number;
	    hasGPS: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ImageMetadata(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filename = source["filename"];
	        this.fileSize = source["fileSize"];
	        this.modifiedAt = source["modifiedAt"];
	        this.format = source["format"];
	        this.width = source["width"];
	        this.height = source["height"];
	        this.dateTaken = source["dateTaken"];
	        this.cameraMake = source["cameraMake"];
	        this.cameraModel = source["cameraModel"];
	        this.lensModel = source["lensModel"];
	        this.focalLength = source["focalLength"];
	        this.aperture = source["aperture"];
	        this.shutterSpeed = source["shutterSpeed"];
	        this.iso = source["iso"];
	        this.flash = source["flash"];
	        this.gpsLat = source["gpsLat"];
	        this.gpsLon = source["gpsLon"];
	        this.hasGPS = source["hasGPS"];
	    }
	}
	export class Shortcut {
	    label: string;
	    key: string;
	    action: string;
	    destination: string;
	
	    static createFrom(source: any = {}) {
	        return new Shortcut(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.label = source["label"];
	        this.key = source["key"];
	        this.action = source["action"];
	        this.destination = source["destination"];
	    }
	}
	export class Profile {
	    id: string;
	    name: string;
	    labelMode: string;
	    shortcuts: Shortcut[];
	    functionButtons: FunctionButton[];
	
	    static createFrom(source: any = {}) {
	        return new Profile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.labelMode = source["labelMode"];
	        this.shortcuts = this.convertValues(source["shortcuts"], Shortcut);
	        this.functionButtons = this.convertValues(source["functionButtons"], FunctionButton);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

