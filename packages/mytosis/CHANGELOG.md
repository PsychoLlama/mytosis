# Change Log

> This changelog adopts the [keep-a-changelog style](http://keepachangelog.com/en/0.3.0/).

> Due to a rocky versioning history, the first stable release will be `v2.0.0`.
**All `v1.x.x` versions are unstable.**

## v1.12.0
### Fixed
- The config `hooks.[before/after].read.field` was being improperly concatenated with node read hooks.

### Changed
- Storage plugins now get a list of keys to read, not just one. Reduces round-trip network requests and improves read performance for databases which support bulk reads.

## v1.11.0
### Added
- `Database#branch` method (useful for aggregating writes before a commit).

## v1.10.4
### Added
- `options.force` flag in `db.read` ignores the cache and reads from plugins.
- API documentation.
- `ConnectionGroup` and `Stream` module exports.

## v1.10.3
### Added
- Performance improvements.
- Some support for offline updates.

## v1.10.2
### Fixed
- `Subscription#dispose` call was throwing an error after stream completion.

## v1.10.1
### Added
- `ConnectionGroup` now passes the instigating connection as the second parameter.
- `Stream` instances now support two parameters.

### Fixed
- The first read, if storage or network plugins were used, would return a different node reference than all subsequent reads.

## v1.10.0
### Added
- Support for network plugins.
- `ConnectionGroup` class for managing groups of network plugins.
- `Stream` class for lazily observing event streams.
- Support for `config.router` in database config.

## v1.9.0
### Added
- new `Database#commit` method applies many updates simultaneously.

### Changed
- Hooks can no longer intercept the `context` property on writes. All updates are expressed as a graph.

## v1.8.1
### Fixed
- Bug preventing node field updates.

## v1.8.0
### Changed
- Updated dependency (graph-crdt) which now uses lamport clocks to manage state.

## v1.7.0
### Added
- New `Database#query` method.

### Changed
- Pipeline now passes an object rather than variadic parameters.

## v1.6.0
### Added
- New `before.read.node` pipeline allows hooks to override key names or options before they reach the storage drivers.
- New `after.read.node` pipeline allows hooks to override return values.
- New `before.read.field` pipeline, same as `before.read.node`, but for properties instead.
- New `after.read.field` pipeline, same as `after.read.field`, but for properties instead. What a twist.

### Changed
- Database configuration objects now have nested fields in `config.hooks[before/after].read`. The fields, `node` and `field`, relate to what type of data is being read.

## v1.5.0
### Added
- Root API extensions via the `config.extend.root` object.
- Context API extensions via the `config.extend.context` object.

### Fixed
- Adding methods or properties to config objects mutated the base configuration, applying those API extensions to all databases.

## v1.4.0
### Added
- New `before.write` pipeline allows hooks to override values before they reach storage plugins.
- New `after.write` pipeline allows hooks to replace or augment contexts before resolving to the user.

## v1.3.0
### Added
- Integration with storage plugins.

## v1.2.1
### Fixed
- npm was publishing the `src` folder, not `dist`.

## v1.2.0
### Fixed
- Context instances are kept in the graph, opposed to their primitive `Node` counterparts.
- Updating `graph-crdt` resolved a method conflict between `Node` and it's subclass, `Context`.

## v1.1.0
### Added
- Root reference database constructor.
- Context constructor.

### Changed
- `trigger` (private API) returns a standard-library promise instead of a Bluebird promise.

## v1.0.0
Initial release (the version number was a mistake).
