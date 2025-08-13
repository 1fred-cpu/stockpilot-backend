import { MiddlewareConsumer, Module } from "@nestjs/common";
import { AuthMiddleware } from "./auth.middleware";
@Module({})
export class AuthMiddlewareModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(AuthMiddleware).forRoutes("/onboarding");
    }
}
