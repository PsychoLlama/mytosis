# Change Log

`mytosis` follows semantic versioning practices and conforms to [this changelog style](http://keepachangelog.com/en/0.3.0/).

> Changelog conforms to [this style](http://keepachangelog.com/en/0.3.0/).

> Due to a versioning mistake, the official public API will be defined in v2.0.0.
**All `v1.x.x` versions should be considered unstable.**

## Unreleased
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
