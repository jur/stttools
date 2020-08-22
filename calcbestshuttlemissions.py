#!/usr/bin/python
from __future__ import print_function
import json
import sys
import os
import getopt
from itertools import permutations

skilllist = [
	"command_skill",
	"diplomacy_skill",
	"engineering_skill",
	"medicine_skill",
	"science_skill",
	"security_skill"
]

skillmap = {
	"com" : "command_skill",
	"dip" : "diplomacy_skill",
	"eng" : "engineering_skill",
	"med" : "medicine_skill",
	"sci" : "science_skill",
	"sec" : "security_skill"
}

missions = [
]

maxshuttles = 3
onlyopen = False

def getskill(crew):
	global sortkey
	return crew['skills'][sortkey]['value']

def getsum(mission):
	if 'sum' in mission:
		return mission['sum']
	else:
		return 0

def getbestsum(mission):
	if 'bestsum' in mission:
		return mission['bestsum']
	else:
		return 0

def prepare_missions(data, sorteddata):
	global sortkey

	for mission in missions:
		skillcombos = mission['skills']
		mission['skills'] = [ ]
		for skillcombo in skillcombos:
			skills = skillcombo.split(',')
			skillstring = ""
			for skill in skills:
				if skill in skillmap:
					skill = skillmap[skill]
				if skillstring == "":
					skillstring = skill
				else:
					skillstring += ',' + skill
			sortkey = skillstring
			if not skillstring in sorteddata:
				sorteddata[skillstring] = sorted(data, key=getskill, reverse=True)
			mission['skills'].append(skillstring)

def get_best_crew(sorteddata, usedcrew, skillcombo):
	i = 0
	while sorteddata[skillcombo][i]['id'] in usedcrew:
		i += 1
	crew = sorteddata[skillcombo][i]
	crew['skillcombo'] = skillcombo
	crewid = crew['id']
	usedcrew[crewid] = 1
	return crew

def free_crew(usedcrew, crewlist):
	for crew in crewlist:
		crewid = crew['id']
		del usedcrew[crewid]

def calc_missions(sorteddata):
	global sortkey
	miscount = len(missions)
	misr = range(miscount)
	misp = permutations(misr, maxshuttles)
	bestmissionsum = 0
	parserun = 0

	for misindices in misp:
		usedcrew = {}
		tosort = [ ]
		for misidx in misindices:
			mission = missions[misidx]

			tosort.append(mission)

			#print("# *** " + mission['name'])
			skillcombos = mission['skills']
			count = len(skillcombos)
			largestsum = 0
			r = range(count)
			p = permutations(r)
			for indices in p:
				crewlist = [0] * count
				sumval = 0
				for idx in indices:
					skillcombo = skillcombos[idx]
					crew = get_best_crew(sorteddata, usedcrew, skillcombo)
					sortkey = skillcombo
					value = getskill(crew)
					crewlist[idx] = crew
					sumval += value
				sumval = sumval / count
				if sumval > largestsum:
					largestsum = sumval
					if 'crew' in mission:
						if mission['crew']:
							free_crew(usedcrew, mission['crew'])
					mission['crew'] = crewlist
					mission['sum'] = sumval
				else:
					free_crew(usedcrew, crewlist)
		sortedmissions = sorted(tosort, key = getsum, reverse=True)
		# Method: total max
		allmissionsum = 0
		for s in range(maxshuttles):
			allmissionsum += sortedmissions[s]['sum']
		# Method: optimize the worst shuttle mission
		missionsum = allmissionsum / 2
		missionsum += sortedmissions[maxshuttles - 1]['sum']
		if bestmissionsum < missionsum:
			bestmissionsum = missionsum
			for mission in missions:
				mission['bestsum'] = 0
				mission['bestcrew'] = 0
				mission['parserun'] = -1
			for mission in sortedmissions:
				mission['bestsum'] = mission['sum']
				mission['bestcrew'] = mission['crew']
				for crew in mission['bestcrew']:
					crew['bestskillcombo'] = crew['skillcombo']
				mission['parserun'] = parserun
		for mission in missions:
			mission['sum'] = 0
			mission['crew'] = None
		parserun += 1

	sortedmissions = sorted(missions, key = getbestsum, reverse=True)
	shuttlenr = 0
	for mission in sortedmissions:
		if shuttlenr >= maxshuttles:
			break
		if 'bestcrew' in mission:
			if mission['bestcrew']:
				print("*** " + mission['faction'])
				print(mission['name'])
				if debug:
					print("parserun %d" % (mission['parserun']))
				print("sum %d" % (mission['bestsum']))
				skillcounter = {}
				for crew in mission['bestcrew']:
					if debug:
						print(crew['bestskillcombo'])
						print("%d" % (crew['id']))
					print(crew['name'])
					skillcombo = crew['bestskillcombo']
					skills = skillcombo.split(',')
					for skill in skills:
						if skill in skillcounter:
							skillcounter[skill] += 1
						else:
							skillcounter[skill] = 1
				count = 0
				for key in skillcounter.keys():
					if skillcounter[key] > count:
						count = skillcounter[key]
						bonusskill = key.split("_")[0]
				print("Best bonus skill: %s" % (bonusskill))
		print("")
		shuttlenr += 1

def calc_skill_combos(skills):
	for skill1 in skilllist:
		for skill2 in skilllist:
			if skill1 != skill2:
				skill = skill1 + ',' + skill2
				skills[skill] = {}
				skills[skill]['value'] = skills[skill1]['value'] + skills[skill2]['value']/4

def get_special_crew_bonus(crew, value):
	if value > 0:
		if 'shuttle_bonus' in crew:
			value *= crew['shuttle_bonus']
	return value

def calc_skill(crew):
	skills = crew['skills']
	for skill in skilllist:
		value = 0
		if skill in skills:
			#value = skills[skill]['core'] + skills[skill]['range_max']
			value = skills[skill]['core']
			value = get_special_crew_bonus(crew, value)
		else:
			skills[skill] = {}
		skills[skill]['value'] = value
	calc_skill_combos(skills)

def calc_skills(data):
	for crew in data:
		calc_skill(crew)

def get_shuttle_missions(shuttles):
	missions = []
	i = 0
	for entry in shuttles:
		for shuttle in entry['shuttles']:
			if onlyopen:
				if shuttle['state'] != 0:
					print("ignoring Mission " + shuttle['name'] + " state %d" % (shuttle['state']))
					continue
			print("Mission %s state %d" % (shuttle['name'], shuttle['state']))
			missions.append({ "name" : shuttle['name'], "skills" : []})
			s = 0
			for slot in shuttle['slots']:
				if debug:
					print("# slot %u" % (s))
				# Only add first skill, TBD: Handle "OR" missions
				missions[i]['skills'].append(slot['skills'][0])
				if debug:
					for skillcombo in slot['skills']:
						print("# " + skillcombo)
				s += 1
			missions[i]['faction'] = "unknown"
			if 'rewards' in shuttle:
				for reward in shuttle['rewards']:
					if 'potential_rewards' in reward:
						for potentialreward in reward['potential_rewards']:
							if 'icon' in potentialreward:
								icon = potentialreward['icon']
								if 'file' in icon:
									iconfile = icon['file']
									#print("# " + iconfile)
									if iconfile.find('transmission') >= 0:
										#print("# " + potentialreward['name'])
										missions[i]['faction'] = potentialreward['name']
			i += 1
	print()
	return missions

def print_help(outfd):
	print("calcbestshuttlemissions.py [options]", file=outfd)
	print("", file=outfd)
	print("Get best missions to be done in a shuttle event.", file=outfd)
	print("Only shuttle missions which are opened or running are considered.", file=outfd)
	print("", file=outfd)
	print("-p [playerfile]                player.json file (input)", file=outfd)
	print("--playerfile=[playerfile]      player.json file (input)", file=outfd)
	print("-d                             Print debug messages", file=outfd)
	print("-o                             Consider only missions which are not started.", file=outfd)
	print("-x [num]                       Maximum number of shuttles parallel", file=outfd)
	print("-h --help                      Print this help", file=outfd)

debug = False

def main(argv):
	#cwd = os.getcwd()
	scriptdir = os.path.dirname(os.path.realpath(__file__))
	jsondir = scriptdir
	playerfilename = jsondir + '/player.json'

	try:
		opts, args = getopt.getopt(argv,"hp:x:do",["help", "playerfile="])
	except getopt.GetoptError:
		print("Parameter wrong", file=sys.stderr)
		print_help(sys.stderr)
		sys.exit(1)

	global debug
	for opt, arg in opts:
		if opt in ("-h", "--help"):
			print_help(sys.stdout)
			sys.exit()
		elif opt == '-d':
			debug = True
		elif opt in ("-p", "--playerfile"):
			playerfilename = arg
		elif opt == '-x':
			global maxshuttles
			maxshuttles = int(arg)
		elif opt == '-o':
			global onlyopen
			onlyopen = True

	with open(playerfilename) as f:
		playerroot = json.load(f)

	global crew_bonuses
	if 'player' in playerroot:
		player = playerroot['player']
		if 'character' in player:
			character = player['character']
			if 'crew' in character:
				data = character['crew']
			if 'shuttle_adventures' in character:
				shuttles = character['shuttle_adventures']
			if 'events' in character:
				events = character['events']
				for event in events:
					if 'content' in event:
						content = event['content']
						if 'shuttles' in content:
							bshuttles = content['shuttles']
							for shuttle in bshuttles:
								if 'crew_bonuses' in shuttle:
									crew_bonuses = shuttle['crew_bonuses']
									for crew in data:
										symbol = crew['symbol']
										if symbol in crew_bonuses:
											if debug:
												print("# crew %s bonus factor %d" % (crew['name'], crew_bonuses[symbol]))
											crew['shuttle_bonus'] = crew_bonuses[symbol]

	global missions

	missions = get_shuttle_missions(shuttles)

	calc_skills(data)

	sorteddata = {}

	prepare_missions(data, sorteddata)
	calc_missions(sorteddata)

if __name__ == "__main__":
	main(sys.argv[1:])

