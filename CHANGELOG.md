# Change Log

> This changelog adopts the [keep-a-changelog style](http://keepachangelog.com/en/0.3.0/).

> Due to a versioning mistake, the official stable API will be defined in v2.0.0.
**All `v1.x.x` versions should be considered unstable.**

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
