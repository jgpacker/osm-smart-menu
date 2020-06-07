describe('What is my browser', () => {
  beforeAll(async () => {
    await page.goto('https://whatismybrowser.com/')
  })

  it('should display "google" text on page', async () => {
    const browser = await page.$eval('.string-major', (el) => el.innerHTML)
    expect(browser).toContain('Chrome')
  })
})