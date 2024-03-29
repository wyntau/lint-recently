# lint-recently
Like lint-staged, but run linters against recently modified git files by times.

## Why
These days more and more projects are constructed as `monorepo`, and some `non-monorepo` projects are really big.
so run lint on the full project spend very long time again and again.

Yes, we can use lint-staged before git commit to lint files partically, but git hooks can be skipped. So many bad code can still be in your codebase.

Then we can run lint-recently in CI/CD, and find out if someone bad guys skip the git hooks and pollute our codebase.

## Usage
```shell
lint-recently
```

## Command line flags
```
Usage: lint-recently [options]

Options:
  -V, --version                      output the version number
  -c, --config [path]                path to configuration file, or - to read from stdin
  --cwd [path]                       run all tasks in specific directory, instead of the current
  -d, --debug                        print additional debug information (default: false)
  -p, --concurrent <number|boolean>  the number of tasks to run concurrently, or false for serial (default: true)
  -q, --quiet                        disable lint-recently’s own console output (default: false)
  -r, --relative                     pass relative filepaths to tasks (default: false)
  -v, --verbose                      show task output even when tasks succeed; by default only failed output is shown (default: false)
  -x, --shell [path]                 skip parsing of tasks for better shell support (default: false)
  -h, --help                         display help for command
```

## Configuration
configuration will be loaded in these files in order.
- `.lintrecentlyrc.json`
- `lint-recently` object in package.json

Options supported are list below
- `days`, integer, we will use `git diff` between the latest commit and `${days}` days ago's commit to find all modified files. Default to 3.
- `patterns`, like lint-staged options in `.lintstagedrc.json`. Patterns should be an object where each value is a command to run and its key is a glob pattern to use for this command

`.lintrecentlyrc.json` example
```json
{
  "$schema": "./node_modules/lint-recently/dist/lib/schema.json",
  "days": 3,
  "patterns": {
    "*.{ts,tsx,js,jsx}": ["eslint"]
  }
}

```

## License
MIT
