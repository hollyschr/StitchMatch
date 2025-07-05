# PDF Management for StitchMatch

## Problem
When the database is updated (especially when migrating from local SQLite to Railway PostgreSQL), uploaded PDF files are lost because:
1. Railway uses an ephemeral filesystem - files are lost on server restart
2. PDF files are stored locally in the `pdf_uploads` directory
3. Database migrations only transfer data, not files

## Solution
Use the PDF management scripts to backup and restore PDFs during database updates.

## Quick Workflow

### Before Database Update
```bash
# 1. Create backup of all PDFs
python manage_pdfs.py backup

# 2. Verify backup was created
python manage_pdfs.py status
```

### After Database Update
```bash
# 1. Restore PDFs from backup
python manage_pdfs.py restore

# 2. Sync PDFs to Railway (if using Railway)
python manage_pdfs.py sync

# 3. Verify everything is working
python manage_pdfs.py status
```

## Available Commands

### `python manage_pdfs.py backup`
- Creates a backup of all PDF files and metadata
- Stores files in `pdf_backup/` directory
- Creates `metadata.json` with pattern information

### `python manage_pdfs.py restore`
- Restores PDF files from backup to `pdf_uploads/` directory
- Only restores files that were successfully backed up

### `python manage_pdfs.py sync`
- Uploads PDFs from backup to Railway
- Only uploads PDFs that aren't already on Railway
- Uses the `/upload-pdf/{pattern_id}` API endpoint

### `python manage_pdfs.py status`
- Shows current status of PDFs:
  - Local PDFs and whether files exist
  - Railway PDFs
  - Backup information

### `python manage_pdfs.py compare`
- Compares local and Railway PDFs
- Shows which PDFs are missing on each side

### `python manage_pdfs.py full`
- Runs complete workflow: backup → sync → status

## File Structure

```
SM_Site/
├── pdf_uploads/          # Active PDF files
├── pdf_backup/           # Backup directory
│   ├── metadata.json     # Backup metadata
│   └── *.pdf            # Backed up PDF files
├── manage_pdfs.py        # Main management script
├── backup_pdfs.py        # Simple backup script
└── upload_pdfs_to_railway.py  # Railway upload script
```

## Troubleshooting

### PDFs not showing on Railway after upload
1. Check if Railway server has restarted (files are lost on restart)
2. Verify the upload API endpoint is working
3. Check Railway logs for errors
4. Re-run the sync process

### PDF files missing locally
1. Check if `pdf_uploads/` directory exists
2. Run `python manage_pdfs.py restore` to restore from backup
3. If no backup exists, PDFs may be permanently lost

### Database shows PDFs but files are missing
1. The database record exists but the actual file is missing
2. Run `python manage_pdfs.py restore` to restore files
3. If no backup exists, users will need to re-upload PDFs

## Best Practices

1. **Always backup before database updates**
   ```bash
   python manage_pdfs.py backup
   ```

2. **Keep backups in version control**
   - Add `pdf_backup/` to your repository
   - This ensures PDFs are preserved even if local files are lost

3. **Test PDF functionality after updates**
   - Verify PDFs can be viewed/downloaded
   - Check that new uploads work correctly

4. **Consider cloud storage for production**
   - For a more permanent solution, consider using AWS S3, Google Cloud Storage, or similar
   - This would eliminate the need for manual PDF management

## Future Improvements

1. **Automatic cloud storage integration**
   - Modify backend to use cloud storage instead of local files
   - Eliminate need for manual PDF management

2. **Database triggers**
   - Automatically backup PDFs when patterns are created/updated
   - Ensure no PDFs are ever lost

3. **Backup scheduling**
   - Regular automated backups
   - Multiple backup versions for recovery

## Emergency Recovery

If PDFs are lost and no backup exists:

1. **Check if Railway has the files**
   ```bash
   python manage_pdfs.py status
   ```

2. **Download from Railway** (if available)
   - Use the download API endpoints
   - Save to local `pdf_uploads/` directory

3. **Ask users to re-upload**
   - As a last resort, users can re-upload their PDFs
   - The database records will still exist, just without the files 