'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useClubSettings } from '@/lib/useClubSettings'
import { MAX_QRIS_BYTES, QRIS_BUCKET, qrisPath } from '@/lib/payment'
import QrisCode from '@/components/QrisCode'

function checkFile(file) {
  if (!file) return 'Choose the QR code image first.'
  if (!file.type.startsWith('image/')) return 'That isn’t an image — choose a PNG or JPG of the QR code.'
  if (file.size > MAX_QRIS_BYTES) return 'That image is over 5 MB — choose a smaller one.'
  return ''
}

const updatedText = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

// Upload the club's QRIS code: guests see it on every payment screen.
export default function PaymentSettingsPage() {
  const { settings, loading, error: loadError, setSettings } = useClubSettings()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [fileError, setFileError] = useState('')
  // Remembers a successful upload, so retrying after a failed save doesn't upload twice.
  const [uploaded, setUploaded] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  function onFileChange(e) {
    const picked = e.target.files?.[0]
    if (!picked) return
    const problem = checkFile(picked)
    setFileError(problem)
    setSaveError('')
    setNotice('')
    if (problem) return
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
  }

  function clearChoice() {
    setFile(null)
    setPreview('')
    setFileError('')
    setSaveError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  async function save(e) {
    e.preventDefault()
    const problem = checkFile(file)
    if (problem) {
      setFileError(problem)
      inputRef.current?.focus()
      return
    }
    setSaving(true)
    setSaveError('')
    setNotice('')
    try {
      let publicUrl = uploaded?.file === file ? uploaded.url : null
      if (!publicUrl) {
        const { data, error } = await supabase.storage
          .from(QRIS_BUCKET)
          .upload(qrisPath(file), file, { contentType: file.type, upsert: false })
        if (error) {
          setSaveError(`Couldn’t upload the image: ${error.message}`)
          return
        }
        publicUrl = supabase.storage.from(QRIS_BUCKET).getPublicUrl(data.path).data.publicUrl
        setUploaded({ file, url: publicUrl })
      }

      const { data: rows, error: updateError } = await supabase
        .from('club_settings')
        .update({ qris_image_url: publicUrl })
        .eq('id', true)
        .select('qris_image_url, updated_at')
      if (updateError) {
        setSaveError(`The image uploaded, but the setting couldn’t be saved: ${updateError.message}`)
        return
      }
      if (!rows?.length) {
        setSaveError('The image uploaded, but the setting wasn’t saved — nothing was changed. Check you’re signed in as an admin.')
        return
      }
      setSettings(rows[0])
      clearChoice()
      setUploaded(null)
      setNotice('Saved — guests now see this QR code when they pay.')
    } catch (err) {
      setSaveError(err?.message || 'Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const current = settings?.qris_image_url

  return (
    <div className="flex flex-col gap-[22px]">
      <div>
        <div className="cc-eyebrow">Admin desk</div>
        <h1 className="cc-page-title">Payment settings</h1>
      </div>
      <p className="m-0 max-w-[640px] text-pretty text-[16px] leading-normal text-ink-soft">
        Upload the club’s QRIS code once. Guests see it on the payment screen, scan it in their banking or e-wallet app,
        and type the session fee themselves.
      </p>

      {loadError ? (
        <div role="alert" className="cc-alert">
          {loadError}
        </div>
      ) : null}

      <div className="grid items-start gap-5 min-[960px]:grid-cols-2">
        <section aria-labelledby="current-qr" className="flex flex-col items-center gap-3.5 rounded-[20px] border border-line bg-surface px-[22px] pb-6 pt-[22px] text-center">
          <h2 id="current-qr" className="cc-eyebrow m-0 self-start">
            Current QR code
          </h2>
          <QrisCode url={current} loading={loading} emptyText="No QR code yet — guests see a “not set up” message." />
          {current && settings?.updated_at ? (
            <div className="text-[13px] text-muted">Updated {updatedText(settings.updated_at)}</div>
          ) : null}
        </section>

        <form
          onSubmit={save}
          noValidate
          aria-labelledby="new-qr"
          className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface px-[22px] pb-6 pt-[22px]"
        >
          <h2 id="new-qr" className="cc-eyebrow m-0">
            {current ? 'Replace QR code' : 'Upload QR code'}
          </h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="qris-file" className="cc-label">
              QR code image
            </label>
            <label
              htmlFor="qris-file"
              className={`flex cursor-pointer items-center gap-3.5 rounded-xl border-[1.5px] border-dashed bg-white p-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-navy ${
                fileError ? 'border-danger' : 'border-[#AAB6C6] hover:border-navy'
              }`}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="size-20 shrink-0 rounded-lg border border-line object-contain" />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-[#EEF1F5] font-display text-[30px] font-black text-navy"
                >
                  +
                </span>
              )}
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] font-semibold">{file ? file.name : 'Choose image'}</span>
                <span className="text-[13px] text-muted">
                  {file ? 'Tap to choose a different image' : 'PNG or JPG of the QRIS code, up to 5 MB'}
                </span>
              </span>
              <input
                ref={inputRef}
                id="qris-file"
                type="file"
                accept="image/*"
                onChange={onFileChange}
                aria-invalid={fileError ? 'true' : undefined}
                aria-describedby={fileError ? 'qris-file-error' : undefined}
                className="sr-only"
              />
            </label>
            {fileError ? (
              <span id="qris-file-error" className="cc-field-error">
                {fileError}
              </span>
            ) : null}
          </div>

          {preview ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-[#EEF1F5] p-4">
              <div className="text-[12px] font-semibold uppercase tracking-[.08em] text-muted">Preview — what guests will see</div>
              <QrisCode url={preview} />
            </div>
          ) : null}

          {saveError ? (
            <div role="alert" className="cc-alert">
              {saveError}
            </div>
          ) : null}
          {notice ? (
            <div role="status" className="text-[14px] font-semibold text-navy">
              {notice}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2.5">
            <button type="submit" disabled={saving || !file} className="cc-btn-primary min-h-[52px] flex-[1_1_200px] text-[19px]">
              {saving ? 'Saving…' : current ? 'Save new QR code' : 'Save QR code'}
            </button>
            {file && !saving ? (
              <button
                type="button"
                onClick={clearChoice}
                className="cc-focus min-h-11 cursor-pointer rounded-md border-none bg-transparent px-3 text-[14px] font-semibold text-muted underline underline-offset-2 hover:text-ink"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}
