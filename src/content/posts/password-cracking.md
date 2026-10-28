---
title: Differences between password cracking tools.
description: What is the difference between tools like hashcat, John the Ripper, fcrackzip and stegseek ?
date: 2026-10-27
tags: [security]
---

So lately I have been sudying a lot of Blue Team Level 1 (Intro course) and playing a lot of Blue Team Labs Online solving their challenges. In many of those challenges cracking some sort of password or passphrase to unlock a ZIP file or uncover a hidden file inside another file (known as Steganography) is very common in order to move forward. Now these different tools confused me at first and I did not know which one to use. So for example why would I use hashcat and not John the Ripper ? Or why prefer one over the other ? Turns out they (can) serve a different purpose (mostly).

At the end we will also talk about wordlists which is a very important subject taking into consideration the nature of this content. Every tool mentioned in this article can use them so it is essential to understand them in some basic level.

## hashcat

hashcat is a tool that can simply crack passwords. I mean the behind the scenes is not really all that simple to begin with but the main purpose of the tool is to crack password hashes. For more info around hashes check [my other post regarding hashes](../hashing-vs-encryption/). Password cracking in general especially when it comes to cracking hashes needs an incredible amount of calculations. Therefore it needs to utilize the GPU and `hashcat` is actually know for it's efficiency and how it utilizes the system's resources. This tool is very similar to John the Ripper which we will see below. For more info regarding the tool you can visit [this website](https://hashcat.net/hashcat/).

## John the Ripper

John the Ripper is also a tool used for cracking passwords for many file types. This tool can support a lot of file formats thanks to it's so-called `Jumbo` version, which is essentially an extended, community-enhanced version fo the original tool. The `Jumbo` version contains support for ZIP with the command `zip2john` for example.

Both of the aforementioned tools are general password cracking tools. They support many formats and different modes, meaning they are not so specialized like `fcrackzip` which we are about to see.

## fcrackzip

This is a password cracking tool that is used just for ZIP files (obviously from the name). We can use it with different flags and wordlists to try and unlock the file. All three tools mentioned till now can be used for cracking ZIP file passwords, this file specialized a bit more in ZIP files, so use whatever tool you feel most comfortable with.

## stegseek

Now stegseek targets `steghide` steganography. Steganography is the method with which a file or generally some data are stored inside other data. For example a text file can be hiden inside an image. The image in this case is called the `cover file` because it is used to cover the payload/data.

***Note: One easy way to detect that is to look for suspiciously large file sizes. For example an image that should be a few megabytes and suddenly is some absurd amount of megabytes (like above 100) then there is probably something else hidden inside Although this is not always accurate because the image can just have a huge resolution, but for the purpose of understanding the concept, we can accept this. Consider only as a suspicious indicator when needed and always confirm.***

Now this embedded data can be locked with a passphrase. NOT a **password** but a **passphrase**. A passphrase can be just a phrase. One example that was included in the BTLO challenges was "cheese on toast". Literally. Passwords and passphrases serve the same purpose overall they are just different types. Stegseek does exactly that. It finds the hidden data inside the cover file and if they are locked, it also tries to crack the passphrase to unlock that data. If the passphrase can be cracked then it extracts the data inside the file.

Now, as mentioned at the very start, all these tools (can) use something called a wordlist. Let's look at what these are.

## Wordlists

A wordlist is exactly what it sounds like: a text file with one possible password per line. Instead of guessing every possible combination of characters, the tool takes each word from the list, tries it (hashes it and compares, or tries it on the ZIP or cover file) and checks if it works. If it does, we found the password.

The most famous one is `rockyou.txt`. It comes from a real breach of a company called RockYou back in 2009, where around 14 million unique passwords were leaked in plain text. If you are on Kali Linux you already have it under `/usr/share/wordlists/` (you may need to unzip it first). Another very popular collection is [SecLists](https://github.com/danielmiessler/SecLists).

### Why bother? Time.

To understand why wordlists matter, look at the alternative: **brute force**, meaning trying every single combination. The number of combinations explodes with every character you add.

Say a password is 8 characters long and uses lowercase letters, uppercase letters and digits. That is 62 possible characters for every position, so:

**62⁸ ≈ 218 trillion combinations**

How fast we can go through them depends on the type of hash. A fast hash like MD5 on a strong GPU can be tried around 10 billion times per second. A slow hash that was designed for passwords, like bcrypt, maybe 100,000 times per second. Now compare that with just running `rockyou.txt` (~14 million passwords):

|                          | Brute force (8 characters) | rockyou.txt          |
| ------------------------ | ------------------------- | -------------------- |
| MD5 (~10 billion/sec)    | ~6 hours                  | less than a second   |
| bcrypt (~100,000/sec)    | ~69 years                 | ~2–3 minutes         |

And that is only 8 characters. Make it 10 and even the fast MD5 case goes from hours to around 2.5 years.

That is the whole point of wordlists. We are not smarter than brute force, we just skip the combinations nobody actually uses. Real people pick `summer2024`, `iloveyou` or their dog's name, not `x7#Qp!2v`, and they reuse the same passwords everywhere. Leaked lists capture exactly that.

### The catch

A wordlist can only find a password that is actually in the list. If the password is long and random, it simply is not there and the tool will finish without finding anything. That is why hashcat and John the Ripper also support **rules**, which modify every word in the list (capitalize the first letter, add `123` or `!` at the end, swap `a` for `@` and so on). This way one word turns into many likely variations without going back to full brute force.

***Note: This also tells you what a good password looks like from the defender's side. Long, random, not reused, ideally generated by a password manager. Those are the ones no wordlist will ever contain.***

## Quick comparison

| Tool            | What it cracks                                                                  | Runs on                                    | Use it when                                                   |
| --------------- | ------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| hashcat         | Password hashes (hundreds of hash types)                                        | GPU (CPU works too, just slower)           | You have a hash and want maximum speed                        |
| John the Ripper | Password hashes, plus many file types through its `*2john` helpers like `zip2john` | CPU (the `Jumbo` version also supports GPUs) | You have a file instead of a hash, or you don't know the hash type |
| fcrackzip       | ZIP files only (classic ZIP encryption)                                         | CPU                                        | You just want to open a password-protected ZIP quickly        |
| stegseek        | Passphrases protecting data hidden with `steghide`                              | CPU                                        | You suspect a file is hiding something inside it              |

All four of them work with wordlists, so everything from the section above applies to every tool here.

## Wrapping up

So which one should you use? It mostly depends on what you have in front of you. A hash? Go with hashcat (or John). A file like a ZIP? John with its `2john` helpers, or fcrackzip if you want something quick and simple. An image that seems to be hiding something? stegseek. And whatever you pick, the wordlist you feed it matters just as much as the tool itself, because a tool can only find a password it actually gets to try.

Hopefully this clears up the confusion I had when I first ran into these tools. If I had read something like this before my first BTLO challenges, it would have saved me quite a few "wait, why is this not working" moments.
