export type LogFields = Record<string, unknown>;

export interface Logger {
	debug(message: string, fields?: LogFields): void;
	info(message: string, fields?: LogFields): void;
	warn(message: string, fields?: LogFields): void;
	error(message: string, fields?: LogFields): void;
	flush(): Promise<void>;
}

export interface LoggerOptions {
	token: string | undefined;
	service: string;
	endpoint?: string;
}
