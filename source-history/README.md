# Source history preservation

These Git bundles preserve the original source HEAD ancestry and all source branches/tags and source PR heads observed on 2026-10-11. Each component in `source-consolidation.json` records the original SHA, bundle SHA-256 and source refs. `local_history_ref` is a local-only convenience; it is not a remote Git ref.

To restore, initialize an empty bare Git repository and fetch the bundle's listed refs:

```sh
git init --bare /tmp/restored-source.git
git bundle list-heads source-history/<component>/original.bundle
git -C /tmp/restored-source.git fetch /absolute/path/to/original.bundle 'refs/heads/*:refs/heads/*' 'refs/tags/*:refs/tags/*' 'refs/pull/*:refs/pull/*'
git -C /tmp/restored-source.git cat-file -e '<source_head>^{commit}'
```

The archive and issue snapshots preserve engineering provenance. They do not authorize package publication, repository deletion or widening a public catalog. Current package source is maintained at the component subpath. Registry package versions and their source provenance must be verified separately.
