import { CloudOptions } from './CloudOptions';
import { ICloudClientBuilder } from './builder/ICloudClientBuilder';

export function ArduinoIoTCloudFactory(builders: ICloudClientBuilder[]): IArduinoIoTCloudFactory {
  return {
    connect: async (options: any) => {
      options = { ...CloudOptions.DEFAULT, ...options };
      const builder = builders.find((b) => b.canBuild(options));
      if (!builder) throw new Error('connection failed: options not valid');

      return builder.build(options) as any;
    },
  };
}
