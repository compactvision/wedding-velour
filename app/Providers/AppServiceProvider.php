<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(
            \App\Domain\Wedding\Repositories\WeddingRepositoryInterface::class,
            \App\Infrastructure\Persistence\Eloquent\Repositories\EloquentWeddingRepository::class
        );
        $this->app->singleton(
            \App\Domain\Wedding\Repositories\GuestRepositoryInterface::class,
            \App\Infrastructure\Persistence\Eloquent\Repositories\EloquentGuestRepository::class
        );
        $this->app->singleton(
            \App\Domain\Wedding\Repositories\WeddingTableRepositoryInterface::class,
            \App\Infrastructure\Persistence\Eloquent\Repositories\EloquentWeddingTableRepository::class
        );
        $this->app->singleton(
            \App\Domain\Wedding\Repositories\MenuItemRepositoryInterface::class,
            \App\Infrastructure\Persistence\Eloquent\Repositories\EloquentMenuItemRepository::class
        );
        $this->app->singleton(
            \App\Domain\Wedding\Repositories\OrderRepositoryInterface::class,
            \App\Infrastructure\Persistence\Eloquent\Repositories\EloquentOrderRepository::class
        );
        $this->app->singleton(
            \App\Domain\Wedding\Repositories\PhotoRepositoryInterface::class,
            \App\Infrastructure\Persistence\Eloquent\Repositories\EloquentPhotoRepository::class
        );
        $this->app->singleton(
            \App\Domain\Wedding\Repositories\TimelineEventRepositoryInterface::class,
            \App\Infrastructure\Persistence\Eloquent\Repositories\EloquentTimelineEventRepository::class
        );
        $this->app->singleton(
            \App\Domain\Wedding\Repositories\WeddingNotificationRepositoryInterface::class,
            \App\Infrastructure\Persistence\Eloquent\Repositories\EloquentWeddingNotificationRepository::class
        );

        $this->app->singleton(\App\Application\Common\CommandBus::class);
        $this->app->singleton(\App\Application\Common\QueryBus::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
