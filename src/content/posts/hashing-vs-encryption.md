---
title: Hashing vs encryption (and why encoding is neither)
description: Three terms that get mixed up all the time, explained by one question — can you get the original back?
date: 2026-09-24
tags: [security]
---

I used to use *hashing*, *encryption* and *encoding* almost interchangeably. They all turn readable text into unreadable text, so what's the difference? It turns out one question separates them:

> **Can you get the original data back, and what do you need to do it?**

## Encoding: anyone can reverse it

Encoding changes the *format* of data so it can be stored or transmitted safely. It is **not security**. There's no key, and anyone can decode it.

```bash
$ echo -n "hello" | base64
aGVsbG8=
$ echo -n "aGVsbG8=" | base64 --decode
hello
```

If you ever see a "secret" that is only Base64-encoded, treat it as plain text.

## Encryption: reversible, but only with the key

Encryption is about **confidentiality**. You scramble the data with a key, and only someone with the right key can turn it back.

- **Symmetric** (e.g. AES): the same key encrypts and decrypts. It's fast and is used for disks, files and most traffic once a connection is set up.
- **Asymmetric** (e.g. RSA, elliptic-curve): a public key encrypts and a private key decrypts. It's used to exchange keys and for digital signatures.

Use encryption when you need the original back later, like a stored message or a file on disk.

## Hashing: one-way, by design

A hash function turns any input into a fixed-length fingerprint, and **there is no key that reverses it**. The same input always gives the same output. Change one character and the output changes completely.

```bash
$ echo -n "hello" | shasum -a 256
2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824  -
```

Hashing is about **integrity**. You use it to check that a downloaded file wasn't tampered with, or to tell whether two pieces of data are identical, without keeping the data itself around.

## The classic case: storing passwords

Passwords should be **hashed, not encrypted**. The server never needs your password back. It only needs to check that what you typed hashes to the same value.

There's one important catch: don't use a fast hash like SHA-256 on its own. Fast is bad here, because an attacker with a leaked database can try billions of guesses per second. Use a deliberately slow, **salted** password-hashing algorithm such as **Argon2id**, **bcrypt** or **scrypt**. The salt is a random value stored next to each hash, so two users with the same password still get different hashes and precomputed lookup tables are useless.

## Cheat sheet

| | Reversible? | Needs a key? | Purpose | Examples |
|---|---|---|---|---|
| Encoding | Yes, by anyone | No | Format / transport | Base64, URL encoding |
| Encryption | Yes, with the key | Yes | Confidentiality | AES, RSA |
| Hashing | No | No | Integrity, verification | SHA-256, Argon2id |
