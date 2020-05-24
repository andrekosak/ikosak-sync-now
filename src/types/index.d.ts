interface TableConfiguration {
	folder: string;
	table: string;
	key: string;
	subDirPattern: string;
	query: string;
	fields: FieldMap[];
}

interface FieldMap {
	field_name: string;
	extension: string;
	name: string;
}

type SyncConfiguration = TableConfiguration[];

interface Settings {
	auth: string;
	instance: string;
}

interface AppMetaData {
	scope: string;
	name: string;
	sysId: string;
}

interface Metadata {
	files: { [key: string]: FileMetaData[] };
	apps: AppMetaData[];
	filesCount: number;
}
interface FileMetaData {
	filePath: string;
	sysId: string;
	field: string;
	hash: string;
	scope: string;
}

interface NowScope {
	link: string;
	value: string;
}
type NowRecordProperty = NowScope | string;
interface NowRecord {
	[key: string]: NowRecordProperty;
}
