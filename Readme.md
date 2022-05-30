### Required env vars:

```
NGROK_URL - current ngrok url (See https://ngrok.com/)

AIRTABLE_API_KEY - airtable api key (See https://airtable.com/account)
AIRTABLE_BASE - airtable base id
```

### Execution:

- Configure your env vars
- Create 'images' folder inside 'public' folder
- Add the images you want to upload to airtable to /public/images/
- Edit the script so the images could be associated with relevant record in airtable
- Start the ngrok
- Run the server using: `DEBUG=myapp:* npm start` :)
