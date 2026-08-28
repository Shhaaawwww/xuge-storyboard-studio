# Changelog

## 0.2.0

### Added

- Local project archive with automatic save, restore, and deletion.
- Durable pipeline jobs in `data/jobs.json`.
- Stage checkpoints after Story Bible, Adaptation Plan, Storyboard, and Audit.
- Browser refresh recovery for active jobs.
- Interrupted-job recovery from the last completed stage.

### Changed

- Platform launchers now build and run a stable non-watching app instead of the development watcher.
- Running jobs no longer expire after 30 minutes. Terminal job records are retained temporarily, while completed project artifacts remain in the local archive.
- Pipeline jobs use a server-issued project ID so recovered stages continue the same project.

### Security and privacy

- Settings, stories, prompts, archives, job checkpoints, logs, and generated output remain local and are excluded from Git.
- No API key or user project data is included in the repository.
