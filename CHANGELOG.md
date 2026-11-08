# Changelog

## [4.0.0](https://github.com/aholstenson/atvik/compare/v3.2.1...v4.0.0) (2026-11-08)


### ⚠ BREAKING CHANGES

* Publish as ESM only and require Node 22

### Features

* Accept overflow behavior as a plain string ([238caca](https://github.com/aholstenson/atvik/commit/238caca2959148fd6d0f78b00c55280738ff9ffc))
* Add map() to change the arguments of events ([c67f387](https://github.com/aholstenson/atvik/commit/c67f38709882647b57e16b4008fa2e40c2eb8a0d))
* Allow several listener monitors and add listenerCount ([95717cd](https://github.com/aholstenson/atvik/commit/95717cd4b9702e4a5faf05f8688c8004e1923896))
* Publish as ESM only and require Node 22 ([f9e958a](https://github.com/aholstenson/atvik/commit/f9e958ae160f4f4a5dd31a154c33c5fa1c0fe6de))
* Stop subscriptions, once and iterators with AbortSignal ([955731f](https://github.com/aholstenson/atvik/commit/955731ff0575426b8b38c51c94b5bc280f4a0a69))
* Unsubscribe handles and iterators with using ([e3c87b5](https://github.com/aholstenson/atvik/commit/e3c87b520738927c2970733859f8f729977ad602))


### Bug Fixes

* Await filter and withThis listeners and keep their errors ([2ce8ea7](https://github.com/aholstenson/atvik/commit/2ce8ea723a332b3369d63660c0997f72f6568b34))
* Run all listeners in parallelEmit and report every error ([772c7cd](https://github.com/aholstenson/atvik/commit/772c7cd2757330af768626d4bee750417fb20162))
* Stop event iterators from hanging or leaking listeners ([60cd0f6](https://github.com/aholstenson/atvik/commit/60cd0f6f664ae4ffe21de40cc61571b482346a7a))
* Type this in filter of Event and AsyncEvent ([c47ba7e](https://github.com/aholstenson/atvik/commit/c47ba7e78bac2d27343a724f5cd849a6b8c44e4b))
