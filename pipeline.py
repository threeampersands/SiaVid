class Acquirer:
	""" Basic definition for data acquisition class """

	def acquire(self, *args):
		""" 	Do something to acquire data. 
			This can e.g return text data directly
			or write extracted frames out to files
			and return list of resulting filenames
			etc. """
		pass

class AcquirerAdapter:
	""" Holds an Acquirer and mediates requests to it """

	def __init__(self, acquirer):
		self.acquirer = acquirer

	def acquire(self, *args):
		return self.acquirer.acquire(*args)

class SearchEngine:
	""" Basic definition for SearchEngine class """

	def performSearch(self, corpus, terms):
		"""	Do something to extract results from corpus
			based on terms. Any method is appropriate """
			
		results = []

		results.append("") # Search method here

		return results

class SearchAdapter:
	""" Holds a SearchEngine and mediates requests to it """

	def __init__(self, engine):
		self.engine = engine

	def performSearch(self, corpus, terms):
		return self.engine.performSearch(corpus, terms)


class DataMiner:
	""" Basic definition for DataMiner class """

	# TODO: Make this run corpus-building in a separate thread
	#       and provide a checkStatus() method for testing if
	#       it's complete

	def __init__(self):
		self.status = 0

	def provideRawData(self, someData):
		self.data = someData;

	def buildCorpus(self, data):
		corpus = [] # Holds processed data
		
		corpus.append(data) # Processing here

		return corpus

	def checkStatus(self):
		# Currently does nothing useful - see class TODO
		return "READY"

class DataMinerAdapter:
	""" Holds a DataMiner and mediates requests to it """

	def __init__(self, dataMiner):
		self.miner = dataMiner
 
	def buildCorpus(self, data):
		return self.miner.buildCorpus(data)

	def checkStatus(self):
		return self.miner.checkStatus()


class Pipeline:
	def __init__(self):
		self.acquire = {}
		self.mine = {}
		self.search = {}

		self.corpus = {}

	def listAcquirers(self):
		""" Returns list of currently registered acquirers """

		return self.acquire.keys()

	def addAcquire(self, acquirer, tag):
		""" Add a new acquirer tagged 'tag' """

		print "Adding acquirer '{0}'.".format(tag)
		self.acquire[tag] = acquirer

	def removeAcquire(self, tag):
		""" Remove the acquirer tagged 'tag' """

		if self.acquire.has_key(tag):
			print "Deleting acquirer '{0}'.".format(tag)
			del self.acquire[tag]
		else:
			print "No acquirer '{0}'.".format(tag)

	def listMiners(self):
		""" Returns list of currently registered data miners """

		return self.mine.keys()

	def addMiner(self, miner, tag):
		""" Add a new data miner tagged 'tag' """

		print "Adding miner '{0}'.".format(tag)
		self.mine[tag] = miner

	def removeMiner(self, tag):
		""" Remove the data miner tagged 'tag' """

		if self.mine.has_key(tag):
			print "Deleting miner '{0}'.".format(tag)
			del self.acquire[tag]
		else:
			print "No miner '{0}'.".format(tag)

	def listSearch(self):
		""" Returns list of currently registered search engines """

		return self.search.keys()


	def addSearch(self, search, tag):
		""" Add a new search engine tagged 'tag' """

		print "Adding search '{0}'.".format(tag)
		self.search[tag] = search

	def removeSearch(self, tag):
		""" Remove the search engine tagged 'tag' """

		if self.search.has_key(tag):
			print "Deleting search '{0}'.".format(tag)
			del self.search[tag]
		else:
			print "No search '{0}'.".format(tag)

	def performSearch(self, corpusTag, searchTag, searchTerms):
		""" Perform a search on a given corpus with a given search engine, using searchterms
			Returns a list of results """

		print "Performing search on corpus '{0}' with engine '{1}', terms '{2}'".format(corpusTag, searchTag, searchTerms)

		if not self.search.has_key(searchTag):
			print "No search '{0}' available.".format(searchTag)
			return

		if not self.corpus.has_key(corpusTag):
			print "No corpus '{0}' available.".format(corpusTag)
			return

		return self.search[searchTag].performSearch(self.corpus[corpusTag], searchTerms)

	def acquireAndBuildCorpus(self, acquireTag, minerTag, corpusTag, *acquireArgs):
		""" Acquire input and generate a corpus from it with a given miner in one step """

		print acquireArgs 
		buildCorpus(corpusTag, minerTag, acquire[acquireTag].acquire(*acquireArgs))

	def buildCorpus(self, minerTag, corpusTag, data):

		""" Generate a corpus from a given dataset using a given miner """
		self.corpus[corpusTag] = self.mine[minerTag].buildCorpus(data)
		

	def reportStatus(self):
		print len(self.acquire), "Acquirers registered:", self.listAcquirers()
		print len(self.mine), "Data Miners registered:", self.listMiners()
		print len(self.search), "Search Engines registered:", self.listSearch()
		print len(self.corpus), "corpuses registered:", self.corpus.keys()
