import { Plugin, Modal, Setting, Notice, App } from 'obsidian';

interface BookData {
	title: string;
	authors: string[];
	publishDate?: string;
	description?: string;
	isbn?: string;
	publisher?: string;
	pageCount?: number;
	language?: string;
	subjects?: string[];
	coverUrl?: string;
}

export default class ChineseNovelLookupsPlugin extends Plugin {
	async onload() {
		// Add command to lookup ISBN
		this.addCommand({
			id: 'lookup-isbn',
			name: 'Lookup Chinese Novel by ISBN',
			callback: () => {
				new ISBNLookupModal(this.app, this).open();
			}
		});

		// Add ribbon icon
		this.addRibbonIcon('book-open', 'Lookup Chinese Novel by ISBN', () => {
			new ISBNLookupModal(this.app, this).open();
		});
	}

	onunload() {
		// Cleanup if needed
	}

	async lookupBookByISBN(isbn: string): Promise<BookData | null> {
		try {
			// Try Open Library API first
			const openLibraryUrl = `https://openlibrary.org/isbn/${isbn}.json`;
			const response = await fetch(openLibraryUrl);
			
			if (!response.ok) {
				// Try Google Books API as fallback
				return await this.lookupGoogleBooks(isbn);
			}

			const data = await response.json();
			
			// Get additional details
			let authors: string[] = [];
			if (data.authors && data.authors.length > 0) {
				for (const author of data.authors) {
					const authorKey = typeof author === 'string' ? author : author.key;
					try {
						const authorResponse = await fetch(`https://openlibrary.org${authorKey}.json`);
						if (authorResponse.ok) {
							const authorData = await authorResponse.json();
							authors.push(authorData.name || 'Unknown Author');
						}
					} catch (e) {
						authors.push('Unknown Author');
					}
				}
			}

			// Get description
			let description = '';
			if (data.description) {
				if (typeof data.description === 'string') {
					description = data.description;
				} else if (data.description.value) {
					description = data.description.value;
				}
			}

			// Get publish date
			let publishDate = '';
			if (data.publish_date) {
				publishDate = data.publish_date;
			} else if (data.first_publish_date) {
				publishDate = data.first_publish_date;
			}

			// Get cover URL
			let coverUrl = '';
			if (data.covers && data.covers.length > 0) {
				coverUrl = `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`;
			}

			// Get subjects
			let subjects: string[] = [];
			if (data.subjects) {
				subjects = data.subjects.slice(0, 10); // Limit to 10 subjects
			}

			return {
				title: data.title || 'Unknown Title',
				authors: authors.length > 0 ? authors : ['Unknown Author'],
				publishDate: publishDate,
				description: description,
				isbn: isbn,
				publisher: data.publishers?.[0] || data.publisher?.[0] || undefined,
				pageCount: data.number_of_pages,
				language: data.languages?.[0]?.key?.replace('/languages/', '') || undefined,
				subjects: subjects,
				coverUrl: coverUrl
			};
		} catch (error) {
			console.error('Error fetching from Open Library:', error);
			// Try Google Books as fallback
			return await this.lookupGoogleBooks(isbn);
		}
	}

	async lookupGoogleBooks(isbn: string): Promise<BookData | null> {
		try {
			const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
			const response = await fetch(url);
			
			if (!response.ok) {
				throw new Error('Google Books API request failed');
			}

			const data = await response.json();
			
			if (!data.items || data.items.length === 0) {
				return null;
			}

			const volumeInfo = data.items[0].volumeInfo;

			return {
				title: volumeInfo.title || 'Unknown Title',
				authors: volumeInfo.authors || ['Unknown Author'],
				publishDate: volumeInfo.publishedDate,
				description: volumeInfo.description,
				isbn: isbn,
				publisher: volumeInfo.publisher,
				pageCount: volumeInfo.pageCount,
				language: volumeInfo.language,
				subjects: volumeInfo.categories || [],
				coverUrl: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.large
			};
		} catch (error) {
			console.error('Error fetching from Google Books:', error);
			return null;
		}
	}

	async createBookNote(bookData: BookData): Promise<void> {
		try {
			// Sanitize filename
			const sanitizedTitle = bookData.title
				.replace(/[<>:"/\\|?*]/g, '')
				.replace(/\s+/g, ' ')
				.trim();
			
			const fileName = `${sanitizedTitle}.md`;
			const filePath = fileName;

			// Check if file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(filePath);
			if (existingFile) {
				new Notice(`File "${fileName}" already exists!`);
				return;
			}

			// Build YAML frontmatter
			const frontmatter: Record<string, any> = {
				title: bookData.title,
			};

			if (bookData.authors && bookData.authors.length > 0) {
				frontmatter.authors = bookData.authors;
			}

			if (bookData.publishDate) {
				frontmatter.publishDate = bookData.publishDate;
			}

			if (bookData.publisher) {
				frontmatter.publisher = bookData.publisher;
			}

			if (bookData.isbn) {
				frontmatter.isbn = bookData.isbn;
			}

			if (bookData.pageCount) {
				frontmatter.pages = bookData.pageCount;
			}

			if (bookData.language) {
				frontmatter.language = bookData.language;
			}

			if (bookData.subjects && bookData.subjects.length > 0) {
				frontmatter.subjects = bookData.subjects;
			}

			if (bookData.coverUrl) {
				frontmatter.cover = bookData.coverUrl;
			}

			// Convert frontmatter to YAML string
			// Helper function to escape YAML strings
			const escapeYamlString = (str: string): string => {
				if (str.includes('\n') || str.includes(':') || str.includes('"') || str.includes("'")) {
					return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
				}
				return str;
			};

			let yamlContent = '---\n';
			for (const [key, value] of Object.entries(frontmatter)) {
				if (Array.isArray(value)) {
					yamlContent += `${key}:\n`;
					value.forEach(item => {
						const escaped = escapeYamlString(String(item));
						yamlContent += `  - ${escaped}\n`;
					});
				} else if (typeof value === 'string') {
					const escaped = escapeYamlString(value);
					yamlContent += `${key}: ${escaped}\n`;
				} else {
					yamlContent += `${key}: ${value}\n`;
				}
			}
			yamlContent += '---\n\n';

			// Create markdown content
			let content = yamlContent;
			content += `# ${bookData.title}\n\n`;
			
			// Add cover image if available
			if (bookData.coverUrl) {
				content += `![Book Cover](${bookData.coverUrl})\n\n`;
			}

			// Add description
			if (bookData.description) {
				content += `## Description\n\n${bookData.description}\n\n`;
			}

			// Add subjects/categories as tags or list
			if (bookData.subjects && bookData.subjects.length > 0) {
				content += `## Subjects\n\n`;
				bookData.subjects.forEach(subject => {
					content += `- ${subject}\n`;
				});
				content += `\n`;
			}

			// Add notes section
			content += `## Notes\n\n`;
			content += `<!-- Add your notes here -->\n\n`;

			// Create the file
			await this.app.vault.create(filePath, content);
			new Notice(`Created note for "${bookData.title}"`);
			
			// Open the file
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (file) {
				await this.app.workspace.openLinkText(filePath, '', true);
			}
		} catch (error) {
			console.error('Error creating book note:', error);
			new Notice(`Error creating note: ${error.message}`);
		}
	}
}

class ISBNLookupModal extends Modal {
	plugin: ChineseNovelLookupsPlugin;
	isbnInput: string = '';

	constructor(app: App, plugin: ChineseNovelLookupsPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.empty();
		contentEl.createEl('h2', { text: 'Lookup Chinese Novel by ISBN' });

		new Setting(contentEl)
			.setName('ISBN')
			.setDesc('Enter the ISBN (10 or 13 digits)')
			.addText(text => {
				text
					.setPlaceholder('e.g., 9787111213826')
					.setValue(this.isbnInput)
					.onChange(value => {
						this.isbnInput = value.replace(/\D/g, ''); // Remove non-digits
						text.setValue(this.isbnInput);
					});
			});

		new Setting(contentEl)
			.addButton(button => {
				button
					.setButtonText('Lookup')
					.setCta()
					.onClick(async () => {
						if (!this.isbnInput || this.isbnInput.length < 10) {
							new Notice('Please enter a valid ISBN (10 or 13 digits)');
							return;
						}

						button.setButtonText('Looking up...');
						button.setDisabled(true);

						try {
							const bookData = await this.plugin.lookupBookByISBN(this.isbnInput);
							
							if (!bookData) {
								new Notice('Book not found. Please check the ISBN and try again.');
								button.setButtonText('Lookup');
								button.setDisabled(false);
								return;
							}

							await this.plugin.createBookNote(bookData);
							this.close();
						} catch (error) {
							console.error('Error during lookup:', error);
							new Notice(`Error: ${error.message}`);
							button.setButtonText('Lookup');
							button.setDisabled(false);
						}
					});
			});

		new Setting(contentEl)
			.addButton(button => {
				button
					.setButtonText('Cancel')
					.onClick(() => {
						this.close();
					});
			});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

