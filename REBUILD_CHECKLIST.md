# Rebuild Checklist - FFmpeg Production Fix

## ✅ Changes Applied

- [x] Updated `src/utils/AsarFFmpegResolver.js` to check both hoisted and nested paths
- [x] Created `scripts/test-production-paths.js` for production path verification
- [x] Added `test:ffmpeg:prod` script to `package.json`
- [x] Verified development mode still works
- [x] Verified production paths exist in current build

## 🔨 Rebuild Steps

### 1. Clean Previous Build (Optional but Recommended)
```bash
rm -rf dist/
rm -rf node_modules/.cache/
```

### 2. Rebuild the Application
```bash
npm run package:mac
```

This will:
- Run webpack in production mode
- Copy assets
- Package the app with electron-builder
- Create the `.app` bundle in `dist/`

### 3. Install the New Build
```bash
# The new build will be in dist/mac/NFT Studio.app
# Copy it to Applications folder
cp -r "dist/mac/NFT Studio.app" /Applications/
```

Or simply drag and drop from `dist/mac/` to `/Applications/` in Finder.

## ✅ Verification Steps

### 1. Verify FFmpeg Binaries Are Unpacked
```bash
ls -la "/Applications/NFT Studio.app/Contents/Resources/app.asar.unpacked/node_modules/ffmpeg-ffprobe-static/"
```

**Expected output:**
```
-rwxr-xr-x  ffmpeg   (47 MB)
-rwxr-xr-x  ffprobe  (47 MB)
```

### 2. Run Production Path Test
```bash
npm run test:ffmpeg:prod
```

**Expected output:**
```
✅ SUCCESS: Both binaries found and accessible!
✅ Both binaries are executable!
```

### 3. Test in the Application

1. **Launch NFT Studio** from Applications folder
2. **Open a project** or create a new one
3. **Render a frame** with video effects
4. **Check the console** for any FFmpeg errors

**Expected result:** Frame renders successfully without FFmpeg errors

### 4. Check Application Logs

If you encounter issues, check the logs:

**macOS:**
```bash
# View real-time logs
log stream --predicate 'process == "NFT Studio"' --level debug

# Or check Console.app
# Filter by "NFT Studio"
```

**Look for:**
- ✅ "FFmpeg config created successfully"
- ✅ "Project instance created with FFmpeg config"
- ❌ "FFmpeg binary not found" (should NOT appear)

## 🐛 Troubleshooting

### Issue: FFmpeg still not found

**Check 1:** Verify the resolver is using the updated code
```bash
# Check if the new code is in the ASAR
grep -a "electron-builder may hoist" "/Applications/NFT Studio.app/Contents/Resources/app.asar"
```

If not found, the build didn't include the updated code. Rebuild.

**Check 2:** Verify binaries are unpacked
```bash
ls -la "/Applications/NFT Studio.app/Contents/Resources/app.asar.unpacked/node_modules/"
```

Should show:
- `ffmpeg-ffprobe-static/` (hoisted location)
- `my-nft-gen/`
- `sharp/`
- `@img/`

**Check 3:** Verify ASAR unpacking configuration
```bash
cat package.json | grep -A 5 "asarUnpack"
```

Should include:
```json
"asarUnpack": [
  "**/node_modules/ffmpeg-ffprobe-static/**/*",
  ...
]
```

### Issue: Binaries not executable

```bash
# Make binaries executable
chmod +x "/Applications/NFT Studio.app/Contents/Resources/app.asar.unpacked/node_modules/ffmpeg-ffprobe-static/ffmpeg"
chmod +x "/Applications/NFT Studio.app/Contents/Resources/app.asar.unpacked/node_modules/ffmpeg-ffprobe-static/ffprobe"
```

This shouldn't be necessary (electron-builder preserves permissions), but can fix permission issues.

### Issue: Development mode broken

```bash
# Test development mode
npm run test:ffmpeg:paths
npm run test:ffmpeg
```

Both should pass. If not, check that `my-nft-gen` is properly linked:
```bash
ls -la node_modules/my-nft-gen
```

Should show symlink to `../../my-nft-gen`

## 📊 Success Criteria

- [ ] Application builds without errors
- [ ] FFmpeg binaries exist in `app.asar.unpacked/node_modules/ffmpeg-ffprobe-static/`
- [ ] `npm run test:ffmpeg:prod` passes
- [ ] Application launches successfully
- [ ] Frame rendering works without FFmpeg errors
- [ ] No errors in application logs related to FFmpeg

## 🎯 Expected Behavior

**Before Fix:**
```
❌ Error: FFmpeg binary not found at: .../my-nft-gen/node_modules/ffmpeg-ffprobe-static/ffmpeg
```

**After Fix:**
```
✅ FFmpeg config created successfully
✅ Project instance created with FFmpeg config
✅ Frame rendered successfully
```

## 📝 Notes

- The fix is **backward-compatible** - works with both hoisted and nested structures
- **Development mode** is unaffected - still uses `require.resolve()`
- **All platforms** supported - macOS, Windows, Linux
- **No configuration changes** needed - automatic detection

## 🚀 Ready to Deploy

Once all verification steps pass, the application is ready for:
- Internal testing
- Beta distribution
- Production release

The FFmpeg integration will work seamlessly in all environments.